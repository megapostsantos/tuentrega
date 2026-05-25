import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/notas")({
  component: NotasPage,
});

const brl = (n: number) => Number(n||0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Oferta = {
  id: string; empresa_id: string; valor: number; data_trabalho: string | null;
  exige_nota_fiscal: boolean; payment_status: string;
};

function NotasPage() {
  const { role } = useAuth();
  if (role !== "entregador") {
    return (
      <div className="p-6">
        <PageHeader title="Notas fiscais" description="Acompanhe as notas fiscais dos seus entregadores" />
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10" />As notas fiscais aparecem nos detalhes de cada pagamento.
        </CardContent></Card>
      </div>
    );
  }
  return <EntregadorNotas />;
}

function EntregadorNotas() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [empresas, setEmpresas] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, string>>({}); // oferta_id -> url
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const sb = supabase as any;
    const { data: ofs } = await sb.from("ofertas")
      .select("id, empresa_id, valor, data_trabalho, exige_nota_fiscal, payment_status")
      .eq("entregador_id", user.id).eq("exige_nota_fiscal", true)
      .in("status", ["completed", "closed"])
      .order("data_trabalho", { ascending: false });
    const list = (ofs ?? []) as Oferta[];
    setOfertas(list);

    const ids = Array.from(new Set(list.map(o => o.empresa_id)));
    if (ids.length) {
      const { data: emp } = await sb.from("empresas").select("id, nome_fantasia, razao_social").in("id", ids);
      const m: Record<string, string> = {};
      (emp ?? []).forEach((e: any) => { m[e.id] = e.nome_fantasia || e.razao_social; });
      setEmpresas(m);
    }
    const ofIds = list.map(o => o.id);
    if (ofIds.length) {
      const { data: ents } = await sb.from("entregas").select("oferta_id, nota_fiscal_url").in("oferta_id", ofIds);
      const m: Record<string, string> = {};
      (ents ?? []).forEach((e: any) => { if (e.nota_fiscal_url) m[e.oferta_id] = e.nota_fiscal_url; });
      setNotas(m);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function upload(oferta: Oferta, file: File) {
    if (file.type !== "application/pdf") return toast.error("Envie um PDF");
    setUploading(oferta.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(null); return; }
    const path = `${user.id}/${oferta.id}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from("notas-fiscais").upload(path, file, { upsert: true });
    if (upErr) { setUploading(null); return toast.error(upErr.message); }
    await (supabase as any).from("entregas").update({ nota_fiscal_url: path }).eq("oferta_id", oferta.id);
    setUploading(null);
    toast.success("Nota fiscal enviada");
    load();
  }

  // Group by empresa+mes
  const grupos = useMemo(() => {
    const m = new Map<string, { empresa_id: string; mes: string; ofertas: Oferta[] }>();
    ofertas.forEach(o => {
      const mes = o.data_trabalho?.slice(0,7) ?? "—";
      const key = `${o.empresa_id}|${mes}`;
      const g = m.get(key) ?? { empresa_id: o.empresa_id, mes, ofertas: [] };
      g.ofertas.push(o); m.set(key, g);
    });
    return Array.from(m.values()).sort((a,b) => b.mes.localeCompare(a.mes));
  }, [ofertas]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Notas fiscais" description="Envie sua NF para liberar pagamentos" />
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> :
        grupos.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            Sem notas fiscais pendentes
          </CardContent></Card>
        ) : grupos.map(g => {
          const total = g.ofertas.reduce((s,o) => s + Number(o.valor||0), 0);
          const pendentes = g.ofertas.filter(o => !notas[o.id]);
          return (
            <Card key={`${g.empresa_id}-${g.mes}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{empresas[g.empresa_id] ?? "Empresa"}</p>
                    <p className="text-xs text-muted-foreground">
                      Referência: {g.mes} · Total: {brl(total)}
                    </p>
                  </div>
                  {pendentes.length === 0 ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />Em dia
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />{pendentes.length} pendente(s)
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {g.ofertas.map(o => {
                    const enviada = !!notas[o.id];
                    return (
                      <div key={o.id} className="flex items-center justify-between gap-2 text-sm border-t pt-2">
                        <div className="min-w-0">
                          <p className="truncate">{o.data_trabalho ? new Date(o.data_trabalho).toLocaleDateString("pt-BR") : "—"} · {brl(Number(o.valor||0))}</p>
                          {enviada ? (
                            <p className="text-xs text-emerald-600">NF enviada</p>
                          ) : (
                            <p className="text-xs text-amber-700">Aguardando NF</p>
                          )}
                        </div>
                        {!enviada && (
                          <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs hover:bg-muted/40">
                            {uploading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Enviar PDF
                            <input type="file" accept="application/pdf" className="hidden"
                              onChange={e => e.target.files?.[0] && upload(o, e.target.files[0])} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      }
    </div>
  );
}
