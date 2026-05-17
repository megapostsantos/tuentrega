import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Upload, CheckCircle2, Clock, FileText, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  component: PagamentosPage,
});

type Periodo = "diario" | "semanal" | "mensal" | "custom";

interface EntregaRow {
  id: string;
  empresa_id: string;
  entregador_id: string;
  valor: number;
  exige_nota_fiscal: boolean;
  nota_fiscal_url: string | null;
  status: string;
  data_entrega: string;
  data_pagamento: string | null;
}

function PagamentosPage() {
  const { role } = useAuth();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Pagamentos PIX"
        description={role === "empresa"
          ? "Pague diretamente seus entregadores via PIX"
          : "Acompanhe seus pagamentos recebidos"}
      />
      {role === "empresa" && <EmpresaFinanceiro />}
      {role === "entregador" && <EntregadorFinanceiro />}
      {!role && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
    </div>
  );
}

/* ---------- Empresa ---------- */

interface GrupoEntregador {
  entregador_id: string;
  nome: string;
  pix_tipo: string | null;
  pix_chave: string | null;
  whatsapp: string | null;
  qtd: number;
  total: number;
  pendentes: EntregaRow[];
  exige_nota_pendente: boolean;
}

function periodoRange(p: Periodo, custom?: { from: string; to: string }) {
  const now = new Date();
  const from = new Date(now);
  if (p === "diario") from.setHours(0, 0, 0, 0);
  else if (p === "semanal") from.setDate(now.getDate() - 7);
  else if (p === "mensal") from.setMonth(now.getMonth() - 1);
  else if (p === "custom" && custom?.from) return { from: new Date(custom.from).toISOString(), to: new Date(custom.to || now).toISOString() };
  return { from: from.toISOString(), to: now.toISOString() };
}

function EmpresaFinanceiro() {
  const [periodo, setPeriodo] = useState<Periodo>("semanal");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [rows, setRows] = useState<EntregaRow[]>([]);
  const [entregadores, setEntregadores] = useState<Record<string, { nome: string; pix_tipo: string | null; pix_chave: string | null; whatsapp: string | null }>>({});
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => periodoRange(periodo, custom), [periodo, custom]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: ents } = await supabase
      .from("entregas")
      .select("*")
      .eq("empresa_id", user.id)
      .gte("data_entrega", range.from)
      .lte("data_entrega", range.to)
      .order("data_entrega", { ascending: false });
    const list = (ents ?? []) as EntregaRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.entregador_id)));
    if (ids.length) {
      const { data: ppl } = await supabase
        .from("entregadores")
        .select("id,nome_completo,pix_tipo,pix_chave,whatsapp")
        .in("id", ids);
      const map: typeof entregadores = {};
      (ppl ?? []).forEach((p: any) => {
        map[p.id] = { nome: p.nome_completo, pix_tipo: p.pix_tipo, pix_chave: p.pix_chave, whatsapp: p.whatsapp };
      });
      setEntregadores(map);
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range.from, range.to]);

  const grupos = useMemo<GrupoEntregador[]>(() => {
    const m = new Map<string, GrupoEntregador>();
    for (const r of rows) {
      const info = entregadores[r.entregador_id];
      const g = m.get(r.entregador_id) ?? {
        entregador_id: r.entregador_id,
        nome: info?.nome ?? "Entregador",
        pix_tipo: info?.pix_tipo ?? null,
        pix_chave: info?.pix_chave ?? null,
        whatsapp: info?.whatsapp ?? null,
        qtd: 0, total: 0, pendentes: [], exige_nota_pendente: false,
      };
      g.qtd += 1;
      if (r.status === "pendente") {
        g.total += Number(r.valor);
        g.pendentes.push(r);
        if (r.exige_nota_fiscal && !r.nota_fiscal_url) g.exige_nota_pendente = true;
      }
      m.set(r.entregador_id, g);
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [rows, entregadores]);

  async function marcarPago(grupo: GrupoEntregador) {
    if (grupo.exige_nota_pendente) return toast.error("Aguardando envio de nota fiscal");
    const ids = grupo.pendentes.map((p) => p.id);
    if (!ids.length) return;
    const { error } = await supabase
      .from("entregas")
      .update({ status: "pago", data_pagamento: new Date().toISOString() })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Pagamento de R$ ${grupo.total.toFixed(2)} registrado`);
    // Notificação WhatsApp (placeholder — log até integração ser conectada)
    if (grupo.whatsapp) {
      console.info("[WhatsApp]", grupo.whatsapp, `TuEntrega: Seu pagamento de R$ ${grupo.total.toFixed(2)} foi confirmado. Chave PIX: ${grupo.pix_chave}`);
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Período</label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Hoje</SelectItem>
              <SelectItem value="semanal">Últimos 7 dias</SelectItem>
              <SelectItem value="mensal">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodo === "custom" && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={custom.from} onChange={(e) => setCustom((p) => ({ ...p, from: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={custom.to} onChange={(e) => setCustom((p) => ({ ...p, to: e.target.value }))} />
            </div>
          </>
        )}
      </div>

      {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> :
        grupos.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Wallet className="mx-auto mb-3 h-10 w-10" />
            Nenhuma entrega no período selecionado
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {grupos.map((g) => (
              <Card key={g.entregador_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{g.nome}</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">{g.qtd} entrega(s) no período</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">R$ {g.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">a pagar</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {g.pix_chave && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">PIX ({g.pix_tipo})</p>
                        <p className="font-mono">{g.pix_chave}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => {
                        navigator.clipboard.writeText(g.pix_chave!); toast.success("Chave copiada");
                      }}><Copy className="h-4 w-4" /></Button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {g.pendentes.length === 0 ? (
                      <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Tudo pago</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {g.pendentes.length} pendente(s)</Badge>
                    )}
                    {g.exige_nota_pendente && (
                      <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20"><FileText className="h-3 w-3" /> Aguardando nota fiscal</Badge>
                    )}
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:opacity-90"
                    disabled={g.pendentes.length === 0 || g.exige_nota_pendente}
                    onClick={() => marcarPago(g)}
                  >
                    Marcar como pago
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ---------- Entregador ---------- */

function EntregadorFinanceiro() {
  const [rows, setRows] = useState<EntregaRow[]>([]);
  const [empresas, setEmpresas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("entregas")
      .select("*")
      .eq("entregador_id", user.id)
      .order("data_entrega", { ascending: false });
    const list = (data ?? []) as EntregaRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.empresa_id)));
    if (ids.length) {
      const { data: emp } = await supabase
        .from("empresas")
        .select("id,nome_fantasia,razao_social")
        .in("id", ids);
      const map: Record<string, string> = {};
      (emp ?? []).forEach((e: any) => { map[e.id] = e.nome_fantasia || e.razao_social; });
      setEmpresas(map);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function uploadNota(entrega: EntregaRow, file: File) {
    if (file.type !== "application/pdf") return toast.error("Envie um PDF");
    setUploading(entrega.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/${entrega.id}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from("notas-fiscais").upload(path, file, { upsert: true });
    if (upErr) { setUploading(null); return toast.error(upErr.message); }
    const { error } = await supabase.from("entregas").update({ nota_fiscal_url: path }).eq("id", entrega.id);
    setUploading(null);
    if (error) return toast.error(error.message);
    toast.success("Nota fiscal enviada");
    load();
  }

  const pendentes = rows.filter((r) => r.status === "pendente");
  const pagos = rows.filter((r) => r.status === "pago");
  const totalPendente = pendentes.reduce((s, r) => s + Number(r.valor), 0);
  const totalPago = pagos.reduce((s, r) => s + Number(r.valor), 0);

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">A receber</p>
          <p className="text-2xl font-bold text-primary">R$ {totalPendente.toFixed(2)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-2xl font-bold">R$ {totalPago.toFixed(2)}</p>
        </CardContent></Card>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Wallet className="mx-auto mb-3 h-10 w-10" /> Nenhum pagamento ainda
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{empresas[r.empresa_id] ?? "Empresa"}</p>
                    <p className="text-xs text-muted-foreground">
                      Entrega em {new Date(r.data_entrega).toLocaleDateString("pt-BR")}
                      {r.data_pagamento && ` · Pago em ${new Date(r.data_pagamento).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-primary">R$ {Number(r.valor).toFixed(2)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.status === "pago"
                    ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</Badge>
                    : <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>}
                  {r.exige_nota_fiscal && (
                    r.nota_fiscal_url
                      ? <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20"><FileText className="h-3 w-3" /> NF enviada</Badge>
                      : <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20"><FileText className="h-3 w-3" /> NF obrigatória</Badge>
                  )}
                </div>
                {r.exige_nota_fiscal && !r.nota_fiscal_url && r.status === "pendente" && (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/40">
                    {uploading === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Enviar nota fiscal (PDF)
                    <input type="file" accept="application/pdf" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadNota(r, e.target.files[0])} />
                  </label>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
