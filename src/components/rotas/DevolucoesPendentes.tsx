import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, CheckCircle2, Loader2, PackageX, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Ocorrencia = {
  id: string; numero_pacote: number | null; package_id: string | null; motivo: string | null;
  sub_motivo: string | null; fotos_urls: string[] | null; created_at: string;
};
type Pacote = { id: string; oferta_id: string; numero_pacote: number; codigo_pacote: string | null; motivo_nao_entrega: string | null };
type Rota = { id: string; titulo: string; entregadores?: { nome_completo?: string | null } | null };

const fotoUrl = (path: string) => supabase.storage.from("entregas-fotos").getPublicUrl(path).data.publicUrl as string;

const SUB: Record<string, string> = {
  ausente: "Cliente ausente", estabelecimento_fechado: "Estabelecimento fechado", recusou: "Cliente recusou",
  endereco_nao_encontrado: "Endereço não encontrado", avariado: "Pacote avariado", outro: "Outro motivo",
};
function rotulo(o: Ocorrencia) {
  const [sub, ...resto] = (o.sub_motivo ?? "").split(" — ");
  return [SUB[sub] ?? sub ?? o.motivo, ...resto].filter(Boolean).join(" — ");
}

export function FotoViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!url} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl p-2">
        <DialogHeader className="sr-only"><DialogTitle>Foto</DialogTitle></DialogHeader>
        {url && <img src={url} alt="Foto da ocorrência" className="max-h-[80vh] w-full rounded object-contain" />}
      </DialogContent>
    </Dialog>
  );
}

export function OcorrenciasLista({ ofertaId }: { ofertaId: string }) {
  const [itens, setItens] = useState<Ocorrencia[] | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("entregas_ocorrencias")
      .select("id, numero_pacote, package_id, motivo, sub_motivo, fotos_urls, created_at")
      .eq("oferta_id", ofertaId).order("created_at", { ascending: false })
      .then(({ data }: any) => setItens((data as Ocorrencia[]) ?? []));
  }, [ofertaId]);
  if (!itens) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!itens.length) return <p className="text-xs text-muted-foreground">Nenhuma ocorrência registrada.</p>;
  return (
    <div className="space-y-2">
      {itens.map((o) => (
        <div key={o.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
          <div className="flex gap-1">
            {(o.fotos_urls ?? []).map((f) => (
              <button key={f} onClick={() => setFoto(fotoUrl(f))} className="h-14 w-14 overflow-hidden rounded border bg-muted">
                <img src={fotoUrl(f)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
            {!(o.fotos_urls ?? []).length && <div className="flex h-14 w-14 items-center justify-center rounded border bg-muted"><Camera className="h-4 w-4 text-muted-foreground" /></div>}
          </div>
          <div className="min-w-0">
            <div className="font-medium">{o.package_id ? `ID ${o.package_id}` : `Pacote #${o.numero_pacote ?? "?"}`}</div>
            <div className="text-xs text-muted-foreground">{rotulo(o)} · {new Date(o.created_at).toLocaleString("pt-BR")}</div>
          </div>
        </div>
      ))}
      <FotoViewer url={foto} onClose={() => setFoto(null)} />
    </div>
  );
}

export function DevolucoesPendentes({
  empresaId, ofertaId, onChanged,
}: { empresaId: string | null; ofertaId?: string; onChanged?: () => void }) {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [ocs, setOcs] = useState<Ocorrencia[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    let q = supabase.from("ofertas").select("id, titulo, entregadores(nome_completo)").eq("status", "awaiting_return");
    if (ofertaId) q = q.eq("id", ofertaId);
    else if (empresaId) q = q.eq("empresa_id", empresaId);
    const { data: of } = await q.order("updated_at", { ascending: false });
    const lista = (of as Rota[]) ?? [];
    setRotas(lista);
    if (lista.length) {
      const ids = lista.map((r) => r.id);
      const { data: pk } = await supabase.from("entregas_pacotes")
        .select("id, oferta_id, numero_pacote, codigo_pacote, motivo_nao_entrega").in("oferta_id", ids).eq("status", "not_delivered").order("numero_pacote");
      setPacotes((pk as Pacote[]) ?? []);
      const { data: oc } = await supabase.from("entregas_ocorrencias")
        .select("id, oferta_id, numero_pacote, package_id, motivo, sub_motivo, fotos_urls, created_at").in("oferta_id", ids);
      setOcs((oc as any[]) ?? []);
    } else { setPacotes([]); setOcs([]); }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaId, ofertaId]);

  async function receber(rotaId: string, opts: { ids?: string[]; extraviar?: boolean }) {
    setBusy(rotaId);
    const { data, error } = await (supabase as any).rpc("receber_devolucao", {
      _oferta_id: rotaId, _pacote_ids: opts.ids, _extraviar: opts.extraviar ?? false,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(data?.concluida ? "Rota encerrada. O valor do entregador foi liberado." : `Recebido. Faltam ${data?.restantes} pacote(s).`);
    setSel(new Set());
    await load();
    onChanged?.();
  }

  if (loading) return null;
  if (!rotas.length) return ofertaId ? null : (
    <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-green-600" />Nenhuma devolução pendente.</CardContent></Card>
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <PackageX className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold">Devoluções para confirmar</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        O entregador devolve os pacotes com problema; confirme o recebimento de cada um. Quando todos forem recebidos a rota é encerrada e o valor dele é liberado.
      </p>
      {rotas.map((r) => {
        const pks = pacotes.filter((p) => p.oferta_id === r.id);
        const selecionados = pks.filter((p) => sel.has(p.id)).map((p) => p.id);
        return (
          <Card key={r.id}>
            <CardContent className="space-y-3 p-4">
              <div>
                <div className="font-semibold">{r.titulo}</div>
                <div className="text-xs text-muted-foreground">{r.entregadores?.nome_completo ?? "Entregador"} · {pks.length} pacote(s) a receber</div>
              </div>
              <div className="space-y-2">
                {pks.map((p) => {
                  const o = ocs.find((x: any) => x.oferta_id === r.id && (x.package_id === p.codigo_pacote || x.numero_pacote === p.numero_pacote));
                  return (
                    <label key={p.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                      <Checkbox checked={sel.has(p.id)} onCheckedChange={() => setSel((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} />
                      <div className="flex gap-1">
                        {(o?.fotos_urls ?? []).map((f) => (
                          <button key={f} type="button" onClick={(e) => { e.preventDefault(); setFoto(fotoUrl(f)); }} className="h-12 w-12 overflow-hidden rounded border bg-muted">
                            <img src={fotoUrl(f)} alt="" className="h-full w-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{p.codigo_pacote ? `ID ${p.codigo_pacote}` : `Pacote #${p.numero_pacote}`}</div>
                        <div className="text-xs text-muted-foreground">{o ? rotulo(o) : p.motivo_nao_entrega ?? "Sem baixa no fechamento"}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="ghost" className="text-red-600" disabled={busy === r.id}
                  onClick={() => confirm("Encerrar a rota registrando os pacotes restantes como EXTRAVIADOS? O entregador perde pontos na nota.") && receber(r.id, { extraviar: true })}>
                  Encerrar como extraviado
                </Button>
                <Button size="sm" variant="outline" disabled={busy === r.id || !selecionados.length} onClick={() => receber(r.id, { ids: selecionados })}>
                  Recebi os selecionados
                </Button>
                <Button size="sm" disabled={busy === r.id} onClick={() => receber(r.id, {})}>
                  {busy === r.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-1 h-4 w-4" />}Recebi todos
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <FotoViewer url={foto} onClose={() => setFoto(null)} />
    </section>
  );
}
