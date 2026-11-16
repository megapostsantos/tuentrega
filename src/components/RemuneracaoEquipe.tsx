import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type MembroPag = { user_id: string; nome: string | null; salario_fixo?: number | string | null; valor_por_entrega?: number | string | null };
const num = (v: unknown) => Number(String(v ?? "").replace(",", ".")) || 0;
export const descricaoRemuneracao = (m: MembroPag) => {
  const f = num(m.salario_fixo), e = num(m.valor_por_entrega);
  if (!f && !e) return "Remuneração não definida";
  return [f ? `${fmtBRL(f)} fixo por mês` : null, e ? `${fmtBRL(e)} por entrega` : null].filter(Boolean).join(" + ");
};

/** Define quanto o funcionário ganha: salário fixo, valor por entrega, ou os dois. */
export function RemuneracaoDialog({ membro, onClose, onSaved }: { membro: MembroPag | null; onClose: () => void; onSaved: () => void }) {
  const [fixo, setFixo] = useState(""); const [entrega, setEntrega] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { setFixo(membro && num(membro.salario_fixo) ? String(membro.salario_fixo).replace(".", ",") : ""); setEntrega(membro && num(membro.valor_por_entrega) ? String(membro.valor_por_entrega).replace(".", ",") : ""); }, [membro]);
  async function salvar() {
    if (!membro) return;
    setSaving(true);
    const { error } = await (supabase as any).from("equipe_empresa").update({ salario_fixo: num(fixo), valor_por_entrega: num(entrega) }).eq("user_id", membro.user_id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Remuneração salva."); onSaved(); onClose();
  }
  return (
    <Dialog open={!!membro} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Remuneração de {membro?.nome}</DialogTitle><DialogDescription>Quem ganha fixo preenche o salário. Quem ganha por entrega preenche o valor por entrega. Dá para ter os dois.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="rm-fixo">Salário fixo por mês (R$)</Label><Input id="rm-fixo" inputMode="decimal" value={fixo} onChange={(e) => setFixo(e.target.value)} placeholder="Ex: 2000,00" /></div>
          <div className="space-y-1"><Label htmlFor="rm-ent">Valor por entrega (R$)</Label><Input id="rm-ent" inputMode="decimal" value={entrega} onChange={(e) => setEntrega(e.target.value)} placeholder="Ex: 0,50" /></div>
          <p className="text-xs text-muted-foreground">Só você vê estes valores. O funcionário não.</p>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TIPOS = [{ v: "salario", l: "Salário" }, { v: "entregas", l: "Por entregas" }, { v: "bonus", l: "Bônus / adicional" }, { v: "outro", l: "Outro" }];
export const rotuloTipoPagamento = (t: string) => TIPOS.find((x) => x.v === t)?.l ?? t;

/** Registra um pagamento ao funcionário. Entra sozinho nas saídas do Financeiro. */
export function PagamentoFuncionarioDialog({ membro, empresaId, onClose, onSaved }: { membro: MembroPag | null; empresaId: string; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState("salario"); const [valor, setValor] = useState(""); const [qtd, setQtd] = useState("");
  const [ref, setRef] = useState(new Date().toISOString().slice(0, 7)); const [data, setData] = useState(new Date().toLocaleDateString("en-CA")); const [obs, setObs] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (membro) { setTipo(num(membro.salario_fixo) ? "salario" : num(membro.valor_por_entrega) ? "entregas" : "salario"); setQtd(""); setObs(""); setValor(num(membro.salario_fixo) ? String(membro.salario_fixo).replace(".", ",") : ""); } }, [membro]);
  function mudarTipo(t: string) { setTipo(t); if (membro) { if (t === "salario") setValor(num(membro.salario_fixo) ? String(membro.salario_fixo).replace(".", ",") : ""); else if (t !== "entregas") setValor(""); } }
  function mudarQtd(q: string) { setQtd(q); if (membro && num(membro.valor_por_entrega)) setValor((Math.round(num(q) * num(membro.valor_por_entrega) * 100) / 100).toFixed(2).replace(".", ",")); }
  async function salvar() {
    if (!membro) return;
    if (!(num(valor) > 0)) return toast.error("Informe o valor pago.");
    setSaving(true);
    const { error } = await (supabase as any).from("pagamentos_equipe").insert({ empresa_id: empresaId, membro_id: membro.user_id, tipo, referencia: ref || null, quantidade: tipo === "entregas" && num(qtd) ? Math.round(num(qtd)) : null, valor: num(valor), data_pagamento: data, observacao: obs.trim() || null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Pagamento de ${fmtBRL(num(valor))} registrado. Já entrou nas saídas.`); onSaved(); onClose();
  }
  return (
    <Dialog open={!!membro} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
        <DialogHeader><DialogTitle>Pagar {membro?.nome}</DialogTitle><DialogDescription>{membro ? descricaoRemuneracao(membro) : ""}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">{TIPOS.map((t) => <button key={t.v} type="button" onClick={() => mudarTipo(t.v)} className={`rounded-full border px-3 py-1.5 text-xs ${tipo === t.v ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{t.l}</button>)}</div>
          {tipo === "entregas" && <div className="space-y-1"><Label htmlFor="pf-qtd">Quantidade de entregas</Label><Input id="pf-qtd" inputMode="numeric" value={qtd} onChange={(e) => mudarQtd(e.target.value)} /></div>}
          <div className="space-y-1"><Label htmlFor="pf-valor">Valor pago (R$)</Label><Input id="pf-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label htmlFor="pf-ref">Mês de referência</Label><Input id="pf-ref" type="month" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="pf-data">Data do pagamento</Label><Input id="pf-data" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label htmlFor="pf-obs">Observação (opcional)</Label><Input id="pf-obs" value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar pagamento"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Últimos pagamentos feitos à equipe. */
export function PagamentosEquipeLista({ empresaId, membros, versao }: { empresaId: string; membros: MembroPag[]; versao: number }) {
  const [lista, setLista] = useState<any[]>([]);
  const carregar = useCallback(async () => {
    const { data } = await (supabase as any).from("pagamentos_equipe").select("*").eq("empresa_id", empresaId).order("data_pagamento", { ascending: false }).order("created_at", { ascending: false }).limit(15);
    setLista(data ?? []);
  }, [empresaId]);
  useEffect(() => { carregar(); }, [carregar, versao]);
  if (lista.length === 0) return null;
  const nome = (id: string) => membros.find((m) => m.user_id === id)?.nome ?? "Funcionário";
  return (
    <div className="rounded-2xl border bg-card p-3 text-sm">
      <div className="mb-2 font-semibold">Últimos pagamentos à equipe</div>
      <ul className="divide-y">
        {lista.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0"><div className="truncate font-medium">{nome(p.membro_id)}</div><div className="truncate text-xs text-muted-foreground">{rotuloTipoPagamento(p.tipo)}{p.referencia ? ` · ${p.referencia}` : ""}{p.quantidade ? ` · ${p.quantidade} entregas` : ""} · {new Date(p.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR")}</div></div>
            <div className="font-semibold tabular-nums">{fmtBRL(p.valor)}</div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Estes pagamentos já aparecem nas saídas do Financeiro.</p>
    </div>
  );
}
