import { useEffect, useState, useCallback } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
  const [salAuto, setSalAuto] = useState(false); const [salDia, setSalDia] = useState("5");
  const [entAuto, setEntAuto] = useState(false); const [entDia, setEntDia] = useState("5");
  const [regras, setRegras] = useState<{ salario?: any; entregas?: any }>({});
  useEffect(() => {
    setFixo(membro && num(membro.salario_fixo) ? String(membro.salario_fixo).replace(".", ",") : ""); setEntrega(membro && num(membro.valor_por_entrega) ? String(membro.valor_por_entrega).replace(".", ",") : "");
    setSalAuto(false); setEntAuto(false); setRegras({});
    if (!membro) return;
    (supabase as any).from("recorrencias").select("*").eq("membro_id", membro.user_id).then(({ data }: any) => {
      const r = { salario: (data ?? []).find((x: any) => x.alvo === "salario"), entregas: (data ?? []).find((x: any) => x.alvo === "entregas") };
      setRegras(r);
      if (r.salario) { setSalAuto(!!r.salario.ativa); setSalDia(String(r.salario.dia)); }
      if (r.entregas) { setEntAuto(!!r.entregas.ativa); setEntDia(String(r.entregas.dia)); }
    });
  }, [membro]);
  async function salvar() {
    if (!membro) return;
    setSaving(true);
    const sb = supabase as any;
    const { error } = await sb.from("equipe_empresa").update({ salario_fixo: num(fixo), valor_por_entrega: num(entrega) }).eq("user_id", membro.user_id);
    if (error) { setSaving(false); return toast.error(error.message); }
    // regras automáticas: criam, atualizam ou pausam
    const dia = (v: string) => Math.min(28, Math.max(1, Math.round(num(v)) || 5));
    const regra = async (alvo: "salario" | "entregas", ligada: boolean, d: string, valor: number, existente: any) => {
      if (existente) return sb.from("recorrencias").update({ ativa: ligada, dia: dia(d), valor }).eq("id", existente.id);
      if (!ligada) return { error: null };
      return sb.from("recorrencias").insert({ alvo, tipo: "saida", categoria: "Pagamento a funcionários", descricao: `${alvo === "salario" ? "Salário" : "Por entregas"} — ${membro.nome}`, valor, dia: dia(d), membro_id: membro.user_id, inicio: new Date().toLocaleDateString("en-CA") });
    };
    const r1 = await regra("salario", salAuto && num(fixo) > 0, salDia, num(fixo), regras.salario);
    const r2 = await regra("entregas", entAuto && num(entrega) > 0, entDia, 0, regras.entregas);
    setSaving(false);
    if (r1.error || r2.error) return toast.error((r1.error ?? r2.error).message);
    // lança na hora o que já venceu
    await sb.rpc("gerar_recorrencias", {});
    toast.success("Remuneração salva."); onSaved(); onClose();
  }
  return (
    <Dialog open={!!membro} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Remuneração de {membro?.nome}</DialogTitle><DialogDescription>Quem ganha fixo preenche o salário. Quem ganha por entrega preenche o valor por entrega. Dá para ter os dois.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="rm-fixo">Salário fixo por mês (R$)</Label><Input id="rm-fixo" inputMode="decimal" value={fixo} onChange={(e) => setFixo(e.target.value)} placeholder="Ex: 2000,00" /></div>
          <div className="space-y-1"><Label htmlFor="rm-ent">Valor por entrega (R$)</Label><Input id="rm-ent" inputMode="decimal" value={entrega} onChange={(e) => setEntrega(e.target.value)} placeholder="Ex: 0,50" /></div>
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={salAuto} onChange={(e) => setSalAuto(e.target.checked)} disabled={!(num(fixo) > 0)} />Lançar o salário sozinho todo mês</label>
            {salAuto && <div className="flex items-center gap-2 pl-6 text-xs">no dia <Input aria-label="Dia do salário" className="h-8 w-16" inputMode="numeric" value={salDia} onChange={(e) => setSalDia(e.target.value)} /> do mês (1 a 28)</div>}
            <label className="flex items-center gap-2"><input type="checkbox" checked={entAuto} onChange={(e) => setEntAuto(e.target.checked)} disabled={!(num(entrega) > 0)} />Pagar as entregas sozinho todo mês</label>
            {entAuto && <div className="flex flex-wrap items-center gap-2 pl-6 text-xs">no dia <Input aria-label="Dia do pagamento por entregas" className="h-8 w-16" inputMode="numeric" value={entDia} onChange={(e) => setEntDia(e.target.value)} /> paga as entregas do mês anterior, contadas nas rotas dele</div>}
          </div>
          <p className="text-xs text-muted-foreground">Só você vê estes valores. O funcionário não. Cada lançamento automático aparece nas saídas do Financeiro.</p>
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
  const [ref, setRef] = useState(new Date().toISOString().slice(0, 7));
  const [ent, setEnt] = useState<null | { entregues: number; ja_pagas: number; a_pagar: number; valor_por_entrega: number }>(null); const [data, setData] = useState(new Date().toLocaleDateString("en-CA")); const [obs, setObs] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (membro) { setTipo(num(membro.salario_fixo) ? "salario" : num(membro.valor_por_entrega) ? "entregas" : "salario"); setQtd(""); setObs(""); setValor(num(membro.salario_fixo) ? String(membro.salario_fixo).replace(".", ",") : ""); } }, [membro]);
  useEffect(() => {
    setEnt(null);
    if (!membro || tipo !== "entregas") return;
    (supabase as any).rpc("entregas_do_membro", { _membro_id: membro.user_id, _mes: ref }).then(({ data }: any) => setEnt(data ?? null));
  }, [membro, tipo, ref]);
  function usarEntregas() { if (ent) mudarQtd(String(ent.a_pagar)); }
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
          {tipo === "entregas" && (
            <div className="space-y-2">
              <div className="rounded-md bg-muted p-2 text-xs">
                {!ent ? "Buscando as entregas nas rotas…" : (
                  <>Nas rotas dele em <strong>{ref}</strong>: <strong>{ent.entregues}</strong> entrega(s) feita(s){ent.ja_pagas > 0 ? `, ${ent.ja_pagas} já paga(s)` : ""} → <strong>{ent.a_pagar}</strong> a pagar.
                    {ent.a_pagar > 0 && <button type="button" className="ml-2 font-semibold underline" onClick={usarEntregas}>Usar {ent.a_pagar}</button>}
                    {ent.entregues === 0 && <div className="mt-1 text-muted-foreground">Só conta rota feita por ele no modo entregador. Se ele também recebe essas rotas em Pagamentos, não pague duas vezes.</div>}</>
                )}
              </div>
              <div className="space-y-1"><Label htmlFor="pf-qtd">Quantidade de entregas</Label><Input id="pf-qtd" inputMode="numeric" value={qtd} onChange={(e) => mudarQtd(e.target.value)} /></div>
            </div>
          )}
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
  async function excluir(id: string) {
    if (!confirm("Excluir este pagamento? Ele sai das saídas do Financeiro.")) return;
    const sb = supabase as any;
    const alvo = lista.find((x) => x.id === id);
    if (alvo?.recorrencia_id) await sb.from("recorrencias_puladas").insert({ empresa_id: empresaId, recorrencia_id: alvo.recorrencia_id, mes_ref: alvo.mes_ref });
    const { error } = await sb.from("pagamentos_equipe").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pagamento excluído."); carregar();
  }
  if (lista.length === 0) return null;
  const nome = (id: string) => membros.find((m) => m.user_id === id)?.nome ?? "Funcionário";
  return (
    <div className="rounded-2xl border bg-card p-3 text-sm">
      <div className="mb-2 font-semibold">Últimos pagamentos à equipe</div>
      <ul className="divide-y">
        {lista.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0"><div className="truncate font-medium">{nome(p.membro_id)}</div><div className="truncate text-xs text-muted-foreground">{p.recorrencia_id ? "automático · " : ""}{rotuloTipoPagamento(p.tipo)}{p.referencia ? ` · ${p.referencia}` : ""}{p.quantidade ? ` · ${p.quantidade} entregas` : ""} · {new Date(p.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR")}</div></div>
            <div className="flex items-center gap-1">
              <div className="font-semibold tabular-nums">{fmtBRL(p.valor)}</div>
              <Button size="icon" variant="ghost" aria-label="Excluir pagamento" onClick={() => excluir(p.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Estes pagamentos já aparecem nas saídas do Financeiro.</p>
    </div>
  );
}
