import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, PenLine, Download, MapPin, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type Pacote = {
  id: string;
  numero_pacote: number;
  endereco_entrega: string;
  codigo_pacote: string | null;
  status: string;
  entregue_em: string | null;
  nome_recebedor: string | null;
  observacao_entrega: string | null;
  motivo_nao_entrega: string | null;
  assinatura_url: string | null;
  foto_pod_url: string | null;
  tentativas: number | null;
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  entregue: { label: "Entregue", cls: "bg-emerald-500/15 text-emerald-700" },
  problema: { label: "Com Problema", cls: "bg-amber-500/15 text-amber-700" },
  devolvido: { label: "Devolvido", cls: "bg-red-500/15 text-red-700" },
};

function normalizeStatus(s: string) {
  const x = (s || "").toLowerCase();
  if (["entregue", "delivered", "concluido", "concluida"].includes(x)) return "entregue";
  if (["problema", "ocorrencia", "falha"].includes(x)) return "problema";
  if (["devolvido", "retornado", "returned"].includes(x)) return "devolvido";
  return "pendente";
}

export function ProofsTab({ ofertaId, ofertaTitulo }: { ofertaId: string; ofertaTitulo: string }) {
  const [loading, setLoading] = useState(true);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("entregas_pacotes")
        .select("id,numero_pacote,endereco_entrega,codigo_pacote,status,entregue_em,nome_recebedor,observacao_entrega,motivo_nao_entrega,assinatura_url,foto_pod_url,tentativas")
        .eq("oferta_id", ofertaId)
        .order("numero_pacote");
      const list: Pacote[] = data ?? [];
      setPacotes(list);

      const paths = list.flatMap(p => [p.assinatura_url, p.foto_pod_url].filter(Boolean) as string[]);
      const urls: Record<string, string> = {};
      await Promise.all(paths.map(async (p) => {
        const { data: s } = await supabase.storage.from("provas-entrega").createSignedUrl(p, 3600);
        if (s) urls[p] = s.signedUrl;
      }));
      setSignedUrls(urls);
      setLoading(false);
    })();
  }, [ofertaId]);

  const counts = useMemo(() => {
    const c = { entregue: 0, problema: 0, pendente: 0, devolvido: 0 };
    for (const p of pacotes) c[normalizeStatus(p.status) as keyof typeof c]++;
    return c;
  }, [pacotes]);

  const filtered = useMemo(
    () => filter === "all" ? pacotes : pacotes.filter(p => normalizeStatus(p.status) === filter),
    [filter, pacotes],
  );

  function exportXlsx() {
    const rows = pacotes.map(p => ({
      "Nº": p.numero_pacote,
      "Código": p.codigo_pacote ?? "",
      "Endereço": p.endereco_entrega,
      "Status": STATUS_MAP[normalizeStatus(p.status)].label,
      "Entregue em": p.entregue_em ? new Date(p.entregue_em).toLocaleString("pt-BR") : "",
      "Recebedor": p.nome_recebedor ?? "",
      "Observação": p.observacao_entrega ?? "",
      "Motivo (não entrega)": p.motivo_nao_entrega ?? "",
      "Tentativas": p.tentativas ?? 0,
      "Foto POD": p.foto_pod_url ? signedUrls[p.foto_pod_url] ?? "sim" : "",
      "Assinatura": p.assinatura_url ? signedUrls[p.assinatura_url] ?? "sim" : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Provas");
    const safe = ofertaTitulo.replace(/[^\w\s-]/g, "").slice(0, 40);
    XLSX.writeFile(wb, `provas-${safe}-${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Relatório exportado");
  }

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <CounterCard label="Entregues" value={counts.entregue} cls="bg-emerald-500/10 text-emerald-700" />
        <CounterCard label="Problema" value={counts.problema} cls="bg-amber-500/10 text-amber-700" />
        <CounterCard label="Pendentes" value={counts.pendente} cls="bg-muted text-muted-foreground" />
      </div>

      <div className="flex gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({pacotes.length})</SelectItem>
            <SelectItem value="entregue">Entregues ({counts.entregue})</SelectItem>
            <SelectItem value="problema">Com problema ({counts.problema})</SelectItem>
            <SelectItem value="pendente">Pendentes ({counts.pendente})</SelectItem>
            <SelectItem value="devolvido">Devolvidos ({counts.devolvido})</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={exportXlsx} disabled={!pacotes.length}>
          <Download className="mr-1 h-4 w-4" /> Excel
        </Button>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-md bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          Nenhum pacote nesta categoria
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((p) => {
          const st = STATUS_MAP[normalizeStatus(p.status)];
          const fotoUrl = p.foto_pod_url ? signedUrls[p.foto_pod_url] : null;
          const sigUrl = p.assinatura_url ? signedUrls[p.assinatura_url] : null;
          return (
            <div key={p.id} className="rounded-lg border p-3 text-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">#{p.numero_pacote} {p.codigo_pacote && <span className="text-xs text-muted-foreground">· {p.codigo_pacote}</span>}</p>
                  <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="break-words">{p.endereco_entrega}</span>
                  </p>
                </div>
                <Badge className={st.cls}>{st.label}</Badge>
              </div>

              {(p.entregue_em || p.nome_recebedor) && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {p.entregue_em && (
                    <div>
                      <p className="text-muted-foreground">Horário</p>
                      <p>{new Date(p.entregue_em).toLocaleString("pt-BR")}</p>
                    </div>
                  )}
                  {p.nome_recebedor && (
                    <div>
                      <p className="text-muted-foreground">Recebedor</p>
                      <p>{p.nome_recebedor}</p>
                    </div>
                  )}
                </div>
              )}

              {p.motivo_nao_entrega && (
                <p className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700">
                  Motivo: {p.motivo_nao_entrega}
                </p>
              )}

              {p.observacao_entrega && (
                <p className="text-xs text-muted-foreground">{p.observacao_entrega}</p>
              )}

              {(fotoUrl || sigUrl) && (
                <div className="flex gap-2 pt-1">
                  {fotoUrl && (
                    <button
                      onClick={() => setLightbox(fotoUrl)}
                      className="group relative h-16 w-16 overflow-hidden rounded border"
                    >
                      <img src={fotoUrl} alt="Foto POD" className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 p-0.5">
                        <Camera className="h-3 w-3 text-white" />
                      </span>
                    </button>
                  )}
                  {sigUrl && (
                    <button
                      onClick={() => setLightbox(sigUrl)}
                      className="flex h-16 w-16 items-center justify-center rounded border bg-white"
                      title="Ver assinatura"
                    >
                      <PenLine className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && (
        <Dialog open onOpenChange={() => setLightbox(null)}>
          <DialogContent className="max-w-3xl">
            <img src={lightbox} alt="" className="w-full" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CounterCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`rounded-lg p-2 text-center ${cls}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}
