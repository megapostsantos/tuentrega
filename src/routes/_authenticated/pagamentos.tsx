import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { exportToExcel } from "@/lib/export";
import {
  Wallet, CheckCircle2, Clock, FileText, Loader2, Copy, ChevronDown, ChevronUp,
  FileDown, FileSpreadsheet, Search, AlertTriangle, MessageSquare, TrendingUp,
  Receipt, Share2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  component: PagamentosPage,
});

const brl = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PagamentosPage() {
  const { role } = useAuth();
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title={role === "entregador" ? "Meus ganhos" : "Pagamentos"}
        description={
          role === "empresa"
            ? "Pague seus entregadores via PIX e acompanhe sua margem"
            : "Acompanhe seus recebimentos por rota"
        }
      />
      {role === "empresa" && <EmpresaFinanceiro />}
      {role === "entregador" && <EntregadorFinanceiro />}
      {!role && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
    </div>
  );
}

/* =========================================================
   EMPRESA
   ========================================================= */

type Oferta = {
  id: string; empresa_id: string; entregador_id: string | null;
  titulo: string; valor: number; valor_por_pacote: number | null;
  quantidade_pacotes: number | null; data_trabalho: string | null;
  status: string; payment_status: string; payment_date: string | null;
  payment_notes: string | null; exige_nota_fiscal: boolean;
};
type EntregadorInfo = {
  nome: string; pix_tipo: string | null; pix_chave: string | null;
  whatsapp: string | null; banco: string | null; cpf: string | null;
  cnpj: string | null; tipo_pessoa: "pf" | "pj";
};

type PeriodKey = "hoje" | "semana" | "mes" | "mes_ant" | "custom";

function rangeOf(p: PeriodKey, custom: { from: string; to: string }) {
  const now = new Date();
  let from: Date, to: Date;
  if (p === "hoje") { from = new Date(now); from.setHours(0,0,0,0); to = now; }
  else if (p === "semana") { from = new Date(now); from.setDate(now.getDate()-7); to = now; }
  else if (p === "mes_ant") {
    from = new Date(now.getFullYear(), now.getMonth()-1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }
  else if (p === "custom" && custom.from) {
    from = new Date(custom.from);
    to = custom.to ? new Date(custom.to + "T23:59:59") : now;
  }
  else { from = new Date(now.getFullYear(), now.getMonth(), 1); to = now; }
  return { from: from.toISOString(), to: to.toISOString() };
}

function EmpresaFinanceiro() {
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [statusFilter, setStatusFilter] = useState<"todos" | "pending" | "paid">("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [pessoas, setPessoas] = useState<Record<string, EntregadorInfo>>({});
  const [nfUrlByOferta, setNfUrlByOferta] = useState<Record<string, { numero: string | null; url: string | null }>>({});
  const [mlValor, setMlValor] = useState(2.6);
  const [pacotesMl, setPacotesMl] = useState(0);
  const [empresaName, setEmpresaName] = useState("");

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [payTarget, setPayTarget] = useState<GrupoEmpresa | null>(null);
  const [showFechamento, setShowFechamento] = useState(false);
  const pendingRef = useRef<HTMLDivElement>(null);
  const paidRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => rangeOf(period, custom), [period, custom]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const sb = supabase as any;

    const [emp, ofs, ops] = await Promise.all([
      sb.from("empresas").select("nome_fantasia, razao_social, tms_valor_padrao_pacote")
        .eq("id", user.id).maybeSingle(),
      sb.from("ofertas").select("id, empresa_id, entregador_id, titulo, valor, valor_por_pacote, quantidade_pacotes, data_trabalho, status, payment_status, payment_date, payment_notes, exige_nota_fiscal")
        .eq("empresa_id", user.id)
        .in("status", ["completed", "closed"])
        .gte("data_trabalho", range.from.slice(0,10))
        .lte("data_trabalho", range.to.slice(0,10))
        .order("data_trabalho", { ascending: false }),
      sb.from("operacoes").select("total_pacotes_sistema, valor_ml_por_pacote, data_operacao")
        .eq("empresa_id", user.id)
        .gte("data_operacao", range.from.slice(0,10))
        .lte("data_operacao", range.to.slice(0,10)),
    ]);

    setEmpresaName(emp.data?.nome_fantasia || emp.data?.razao_social || "Empresa");
    const list = (ofs.data ?? []) as Oferta[];
    setOfertas(list);

    let totPac = 0; let mlV = Number(emp.data?.tms_valor_padrao_pacote ?? 2.6);
    (ops.data ?? []).forEach((o: any) => {
      totPac += Number(o.total_pacotes_sistema || 0);
      if (o.valor_ml_por_pacote) mlV = Number(o.valor_ml_por_pacote);
    });
    setPacotesMl(totPac); setMlValor(mlV);

    const ids = Array.from(new Set(list.map(o => o.entregador_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: ppl } = await sb.from("entregadores")
        .select("id, nome_completo, pix_tipo, pix_chave, whatsapp, banco, cpf, cnpj, tipo_pessoa").in("id", ids);
      const map: Record<string, EntregadorInfo> = {};
      (ppl ?? []).forEach((p: any) => {
        const isPj = p.tipo_pessoa === "pj" || (p.cnpj && String(p.cnpj).trim().length > 0);
        map[p.id] = {
          nome: p.nome_completo, pix_tipo: p.pix_tipo, pix_chave: p.pix_chave,
          whatsapp: p.whatsapp, banco: p.banco, cpf: p.cpf,
          cnpj: p.cnpj ?? null, tipo_pessoa: isPj ? "pj" : "pf",
        };
      });
      setPessoas(map);
    } else setPessoas({});

    // load pagamentos to expose NF number/url per oferta
    const ofIds = list.map(o => o.id);
    if (ofIds.length) {
      const { data: pgs } = await sb.from("pagamentos")
        .select("ofertas_ids, nf_numero, nf_url")
        .eq("empresa_id", user.id)
        .overlaps("ofertas_ids", ofIds);
      const nfMap: Record<string, { numero: string | null; url: string | null }> = {};
      (pgs ?? []).forEach((p: any) => {
        (p.ofertas_ids ?? []).forEach((oid: string) => {
          if (ofIds.includes(oid)) nfMap[oid] = { numero: p.nf_numero ?? null, url: p.nf_url ?? null };
        });
      });
      setNfUrlByOferta(nfMap);
    } else setNfUrlByOferta({});

    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range.from, range.to]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("pagamentos-empresa")
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "pagamentos" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, []);

  // Group by deliverer
  const grupos = useMemo<GrupoEmpresa[]>(() => {
    const m = new Map<string, GrupoEmpresa>();
    for (const o of ofertas) {
      if (!o.entregador_id) continue;
      const info = pessoas[o.entregador_id];
      const g: GrupoEmpresa = m.get(o.entregador_id) ?? {
        entregador_id: o.entregador_id,
        nome: info?.nome ?? "Entregador",
        pix_tipo: info?.pix_tipo ?? null, pix_chave: info?.pix_chave ?? null,
        whatsapp: info?.whatsapp ?? null, banco: info?.banco ?? null, cpf: info?.cpf ?? null,
        cnpj: info?.cnpj ?? null, tipo_pessoa: info?.tipo_pessoa ?? "pf",
        ofertas: [], total_pendente: 0, total_pago: 0, has_nf_pending: false,
      };
      g.ofertas.push(o);
      if (o.payment_status === "paid") g.total_pago += Number(o.valor || 0);
      else { g.total_pendente += Number(o.valor || 0); if (o.exige_nota_fiscal) g.has_nf_pending = true; }
      m.set(o.entregador_id, g);
    }
    let arr = Array.from(m.values());
    if (search.trim()) arr = arr.filter(g => g.nome.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter === "pending") arr = arr.filter(g => g.total_pendente > 0);
    if (statusFilter === "paid") arr = arr.filter(g => g.total_pago > 0);
    return arr.sort((a,b) => b.total_pendente - a.total_pendente);
  }, [ofertas, pessoas, search, statusFilter]);

  const totalPendente = ofertas.filter(o => o.payment_status === "pending").reduce((s,o) => s + Number(o.valor||0), 0);
  const totalPagoMes = ofertas.filter(o => o.payment_status === "paid").reduce((s,o) => s + Number(o.valor||0), 0);
  const recebidoMl = pacotesMl * mlValor;
  const margem = recebidoMl - totalPagoMes;
  const margemPct = recebidoMl > 0 ? Math.round((margem / recebidoMl) * 100) : 0;

  function toggleExpanded(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function exportExcel() {
    const headers = ["Entregador", "Data", "Valor", "Status"];
    const rows = grupos.flatMap(g => g.ofertas.map(o => [
      g.nome,
      o.data_trabalho ?? "",
      Number(o.valor || 0),
      o.payment_status === "paid" ? "Pago" : "Pendente",
    ] as (string | number)[]));
    const total = rows.reduce((s, r) => s + Number(r[2] || 0), 0);
    rows.push(["TOTAL", "", total, ""]);
    exportToExcel(`pagamentos-${new Date().toISOString().slice(0,10)}`, headers, rows);
  }

  function exportPdf() { window.print(); }

  async function cobrarNF(g: GrupoEmpresa) {
    toast.success(`Lembrete de NF enviado para ${g.nome}`);
    if (g.whatsapp) console.info("[WhatsApp]", g.whatsapp,
      `TuEntrega: ${empresaName} aguarda sua nota fiscal para liberar ${brl(g.total_pendente)}.`);
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard color="orange" label="Total a pagar" value={brl(totalPendente)}
          icon={Clock} onClick={() => pendingRef.current?.scrollIntoView({ behavior: "smooth" })} />
        <SummaryCard color="green" label="Pago este mês" value={brl(totalPagoMes)}
          icon={CheckCircle2} onClick={() => paidRef.current?.scrollIntoView({ behavior: "smooth" })} />
        <SummaryCard color="blue" label="Recebido do ML" value={brl(recebidoMl)}
          hint={`${pacotesMl} pacotes × ${brl(mlValor)}`} icon={Wallet} />
        <SummaryCard color="purple" label="Margem do mês"
          value={brl(margem)} hint={`${margemPct}%`} icon={TrendingUp} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {([
              ["hoje","Hoje"],["semana","Esta semana"],["mes","Este mês"],
              ["mes_ant","Mês anterior"],["custom","Personalizado"],
            ] as [PeriodKey,string][]).map(([k,l]) => (
              <Chip key={k} active={period===k} onClick={() => setPeriod(k)}>{l}</Chip>
            ))}
          </div>
          {period === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={custom.from} onChange={e => setCustom(p => ({...p, from: e.target.value}))} />
              <Input type="date" value={custom.to} onChange={e => setCustom(p => ({...p, to: e.target.value}))} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(["todos","pending","paid"] as const).map(s => (
              <Chip key={s} active={statusFilter===s} onClick={() => setStatusFilter(s)}>
                {s==="todos"?"Todos":s==="pending"?"Pendente":"Pago"}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar entregador..." className="pl-9"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileDown className="h-4 w-4 mr-1" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
            </Button>
            <Button variant="default" size="sm" onClick={() => setShowFechamento(true)}>
              Fechamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
      ) : grupos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Wallet className="mx-auto mb-3 h-10 w-10" /> Nenhuma rota concluída no período
        </CardContent></Card>
      ) : (
        <div className="space-y-3" ref={pendingRef}>
          {grupos.map(g => {
            const isOpen = expanded.has(g.entregador_id);
            return (
              <Card key={g.entregador_id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{g.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        PIX: {g.pix_chave || "—"} {g.banco ? `· ${g.banco}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">{g.ofertas.length} rotas</Badge>
                        {g.tipo_pessoa === "pj" ? (
                          <Badge className="text-[10px] bg-orange-500/15 text-orange-700 hover:bg-orange-500/15">
                            PJ
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-muted text-muted-foreground hover:bg-muted">
                            PF
                          </Badge>
                        )}
                        {g.tipo_pessoa === "pj" && g.total_pendente > 500 && (
                          <Badge className="text-[10px] bg-red-500/15 text-red-700 hover:bg-red-500/15">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />NF obrigatória
                          </Badge>
                        )}
                        {g.has_nf_pending && (
                          <Badge className="text-[10px] bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />NF pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-primary">{brl(g.total_pendente)}</p>
                      <p className="text-[10px] text-muted-foreground">pendente</p>
                      {g.total_pago > 0 && <p className="text-[10px] text-emerald-600">{brl(g.total_pago)} pago</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.pix_chave && (
                      <Button size="sm" variant="outline" onClick={() => {
                        navigator.clipboard.writeText(g.pix_chave!); toast.success("PIX copiado");
                      }}>
                        <Copy className="h-3 w-3 mr-1" />Copiar PIX
                      </Button>
                    )}
                    <Button size="sm"
                      disabled={g.total_pendente <= 0 || g.has_nf_pending}
                      onClick={() => setPayTarget(g)}>
                      Marcar pago
                    </Button>
                    {g.has_nf_pending && (
                      <Button size="sm" variant="ghost" onClick={() => cobrarNF(g)}>
                        <MessageSquare className="h-3 w-3 mr-1" />Cobrar NF
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="ml-auto"
                      onClick={() => toggleExpanded(g.entregador_id)}>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  {isOpen && (
                    <div className="space-y-2 border-t pt-3">
                      {g.ofertas.map(o => (
                        <div key={o.id} className="flex items-start justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{o.titulo}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.data_trabalho ? new Date(o.data_trabalho).toLocaleDateString("pt-BR") : "—"}
                              {o.quantidade_pacotes ? ` · ${o.quantidade_pacotes} pacotes × ${brl(Number(o.valor_por_pacote||0))}` : ""}
                            </p>
                            {o.exige_nota_fiscal && o.payment_status === "pending" && (
                              <p className="text-[10px] text-amber-700">⚠️ Aguardando NF</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-1">
                            {g.tipo_pessoa === "pj" && o.payment_status === "paid" && nfUrlByOferta[o.id]?.url && (
                              <a
                                href={nfUrlByOferta[o.id].url!}
                                target="_blank"
                                rel="noreferrer"
                                title={`Ver NF${nfUrlByOferta[o.id].numero ? ` ${nfUrlByOferta[o.id].numero}` : ""}`}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <div>
                              <p className="font-semibold">{brl(Number(o.valor||0))}</p>
                              <Badge variant={o.payment_status==="paid"?"secondary":"outline"} className="text-[10px]">
                                {o.payment_status==="paid"?"Pago":"Pendente"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          <div ref={paidRef} />
        </div>
      )}

      {payTarget && (
        <MarkPaidDialog grupo={payTarget} empresaName={empresaName}
          onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); load(); }} />
      )}
      {showFechamento && (
        <FechamentoDialog empresaName={empresaName} pacotesMl={pacotesMl} mlValor={mlValor}
          ofertas={ofertas} pessoas={pessoas} onClose={() => setShowFechamento(false)} />
      )}
    </div>
  );
}

type GrupoEmpresa = {
  entregador_id: string; nome: string;
  pix_tipo: string | null; pix_chave: string | null;
  whatsapp: string | null; banco: string | null; cpf: string | null;
  cnpj: string | null; tipo_pessoa: "pf" | "pj";
  ofertas: Oferta[]; total_pendente: number; total_pago: number; has_nf_pending: boolean;
};

function SummaryCard({ color, label, value, hint, icon: Icon, onClick }: {
  color: "orange"|"green"|"blue"|"purple"; label: string; value: string;
  hint?: string; icon: any; onClick?: () => void;
}) {
  const colorMap = {
    orange: "bg-orange-500/10 text-orange-600",
    green: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
  };
  return (
    <button onClick={onClick} disabled={!onClick}
      className={cn("rounded-2xl border bg-card p-4 elev-1 text-left transition-all",
        onClick && "press-scale hover:elev-2")}>
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", colorMap[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
      {children}
    </button>
  );
}

/* ---------- Mark paid dialog ---------- */
function MarkPaidDialog({ grupo, empresaName, onClose, onDone }: {
  grupo: GrupoEmpresa; empresaName: string; onClose: () => void; onDone: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [obs, setObs] = useState("");
  const [nfNumero, setNfNumero] = useState("");
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const isPj = grupo.tipo_pessoa === "pj";
  const pendingOfertas = grupo.ofertas.filter(o => o.payment_status === "pending");
  const total = pendingOfertas.reduce((s,o) => s + Number(o.valor||0), 0);

  async function confirm() {
    if (isPj && (!nfNumero.trim() || !nfFile)) {
      return toast.error("Para entregadores PJ, informe o número da NF e anexe o arquivo.");
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const sb = supabase as any;
    const ids = pendingOfertas.map(o => o.id);
    const ts = new Date(date + "T12:00:00").toISOString();

    let nfUrl: string | null = null;
    if (isPj && nfFile) {
      const ext = nfFile.name.split(".").pop() || "pdf";
      const path = `empresa/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("notas-fiscais")
        .upload(path, nfFile, { contentType: nfFile.type, upsert: false });
      if (upErr) { setSaving(false); return toast.error("Falha no upload da NF: " + upErr.message); }
      const { data: signed } = await supabase.storage.from("notas-fiscais")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      nfUrl = signed?.signedUrl ?? null;
    }

    const { error } = await sb.from("ofertas").update({
      payment_status: "paid", payment_date: ts,
      payment_notes: obs || null, payment_confirmed_by: user.id,
    }).in("id", ids);
    if (error) { setSaving(false); return toast.error(error.message); }

    await sb.from("pagamentos").insert({
      empresa_id: user.id, entregador_id: grupo.entregador_id, ofertas_ids: ids,
      valor_total: total, data_pagamento: ts, observacao: obs || null, created_by: user.id,
      nf_numero: nfNumero.trim() || null, nf_url: nfUrl,
    });
    await sb.from("entregas").update({ status: "pago", data_pagamento: ts })
      .in("oferta_id", ids).eq("status", "pendente");

    if (grupo.whatsapp) console.info("[WhatsApp]", grupo.whatsapp,
      `TuEntrega ✅ Pagamento de ${brl(total)} confirmado por ${empresaName}.`);

    toast.success(`Pagamento de ${brl(total)} registrado! ${grupo.nome} foi notificado.`);
    setSaving(false); onDone();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
          <DialogDescription>
            Você confirma que realizou a transferência PIX?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nome</span>
              <span className="font-medium flex items-center gap-1">
                {grupo.nome}
                <Badge className={cn("text-[10px]", isPj ? "bg-orange-500/15 text-orange-700" : "bg-muted text-muted-foreground")}>
                  {isPj ? "PJ" : "PF"}
                </Badge>
              </span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">PIX</span><span className="font-mono text-xs">{grupo.pix_chave || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Banco</span><span>{grupo.banco || "—"}</span></div>
            <div className="flex justify-between border-t pt-1 mt-1"><span className="text-muted-foreground">Valor</span>
              <span className="font-bold text-primary">{brl(total)}</span></div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Data do pagamento</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {isPj && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Número da NF <span className="text-red-600">*</span></label>
                <Input value={nfNumero} onChange={e => setNfNumero(e.target.value)} placeholder="Ex: 000123" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Arquivo da NF (PDF) <span className="text-red-600">*</span></label>
                <Input type="file" accept="application/pdf"
                  onChange={e => setNfFile(e.target.files?.[0] ?? null)} />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Observação (opcional)</label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirm} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Fechamento mensal ---------- */
function FechamentoDialog({ empresaName, pacotesMl, mlValor, ofertas, pessoas, onClose }: {
  empresaName: string; pacotesMl: number; mlValor: number;
  ofertas: Oferta[]; pessoas: Record<string, EntregadorInfo>; onClose: () => void;
}) {
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const recebido = pacotesMl * mlValor;
  const paidOfertas = ofertas.filter(o => o.payment_status === "paid");
  const pago = paidOfertas.reduce((s,o) => s + Number(o.valor||0), 0);
  const margem = recebido - pago;
  const margemPct = recebido > 0 ? ((margem / recebido) * 100).toFixed(1) : "0";
  const entregadoresAtivos = new Set(ofertas.map(o => o.entregador_id).filter(Boolean)).size;
  const mediaEntregador = entregadoresAtivos ? margem / entregadoresAtivos : 0;

  // Obrigações fiscais — split por tipo_pessoa
  let pagoPj = 0, pagoPf = 0, nfsEsperadas = 0;
  paidOfertas.forEach(o => {
    if (!o.entregador_id) return;
    const isPj = pessoas[o.entregador_id]?.tipo_pessoa === "pj";
    const v = Number(o.valor || 0);
    if (isPj) { pagoPj += v; if (o.exige_nota_fiscal) nfsEsperadas += 1; }
    else pagoPf += v;
  });

  // Consultar NFs recebidas no mês
  const [nfsRecebidas, setNfsRecebidas] = useState(0);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data } = await (supabase as any).from("pagamentos")
        .select("nf_url").eq("empresa_id", user.id)
        .gte("data_pagamento", monthStart).not("nf_url", "is", null);
      setNfsRecebidas((data ?? []).length);
    })();
  }, []);
  const nfsPendentes = Math.max(0, nfsEsperadas - nfsRecebidas);

  // Best deliverer
  const totals: Record<string, number> = {};
  ofertas.forEach(o => { if (o.entregador_id) totals[o.entregador_id] = (totals[o.entregador_id]||0) + Number(o.valor||0); });
  const best = Object.entries(totals).sort((a,b) => b[1]-a[1])[0];
  const bestName = best ? (pessoas[best[0]]?.nome ?? "—") : "—";

  function exportPdf() { window.print(); }
  function exportXlsx() {
    const data = [
      { Item: "Pacotes entregues (ML)", Valor: pacotesMl },
      { Item: "Recebido do ML", Valor: recebido },
      { Item: "Pago a entregadores", Valor: pago },
      { Item: "Pago a PJs", Valor: pagoPj },
      { Item: "Pago a PFs", Valor: pagoPf },
      { Item: "NFs esperadas (PJ)", Valor: nfsEsperadas },
      { Item: "NFs recebidas", Valor: nfsRecebidas },
      { Item: "NFs pendentes", Valor: nfsPendentes },
      { Item: "Margem bruta", Valor: margem },
      { Item: "Margem %", Valor: margemPct + "%" },
      { Item: "Entregadores ativos", Valor: entregadoresAtivos },
      { Item: "Melhor entregador", Valor: bestName },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Fechamento");
    XLSX.writeFile(wb, `fechamento-${new Date().toISOString().slice(0,7)}.xlsx`);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechamento de {mes}</DialogTitle>
          <DialogDescription>{empresaName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <Section title="Receita">
            <Row k="Pacotes entregues" v={String(pacotesMl)} />
            <Row k={`Recebido ML (×${brl(mlValor)})`} v={brl(recebido)} />
            <Row k="Total receita" v={brl(recebido)} bold />
          </Section>
          <Section title="Custos">
            <Row k="Pago a entregadores" v={brl(pago)} />
            <Row k="Total custos" v={brl(pago)} bold />
          </Section>
          <Section title="Obrigações fiscais">
            <Row k="Total pago a PJs" v={brl(pagoPj)} />
            <Row k="Total pago a PFs" v={brl(pagoPf)} />
            <Row k="NFs recebidas" v={`${nfsRecebidas} de ${nfsEsperadas}`} />
            {nfsPendentes > 0 && (
              <Row k="NFs pendentes" v={`⚠️ ${nfsPendentes}`} bold />
            )}
          </Section>
          <Section title="Margem">
            <Row k="Margem bruta" v={brl(margem)} bold />
            <Row k="Margem %" v={`${margemPct}%`} />
            <Row k="Média por entregador" v={brl(mediaEntregador)} />
          </Section>
          <Section title="Performance">
            <Row k="Entregadores ativos" v={String(entregadoresAtivos)} />
            <Row k="Melhor entregador" v={bestName} />
          </Section>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" onClick={exportXlsx}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
      <div className="rounded-lg border bg-muted/30 p-3 space-y-1">{children}</div>
    </div>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between", bold && "font-bold border-t pt-1 mt-1")}>
      <span className="text-muted-foreground">{k}</span><span>{v}</span>
    </div>
  );
}

/* =========================================================
   ENTREGADOR
   ========================================================= */

function EntregadorFinanceiro() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [empresas, setEmpresas] = useState<Record<string, string>>({});
  const [entregas, setEntregas] = useState<Record<string, { id: string; nota_fiscal_url: string | null }>>({});
  const [me, setMe] = useState<{ id: string; nome: string; cnpj: string | null; tipo_pessoa: "pf" | "pj" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [receipt, setReceipt] = useState<Oferta | null>(null);
  const [showHowToNf, setShowHowToNf] = useState(false);
  const [nfUploadFor, setNfUploadFor] = useState<{ ofertaId: string; entregaId: string } | null>(null);
  const [pagamentos, setPagamentos] = useState<Array<{ id: string; valor_total: number; data_pagamento: string; nf_numero: string | null; empresa_id: string }>>([]);
  const [informarNf, setInformarNf] = useState<{ id: string; valor: number } | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const sb = supabase as any;
    const [meRes, ofRes] = await Promise.all([
      sb.from("entregadores").select("id, nome_completo, cnpj, tipo_pessoa").eq("id", user.id).maybeSingle(),
      sb.from("ofertas")
        .select("id, empresa_id, entregador_id, titulo, valor, valor_por_pacote, quantidade_pacotes, data_trabalho, status, payment_status, payment_date, payment_notes, exige_nota_fiscal")
        .eq("entregador_id", user.id)
        .in("status", ["completed", "closed"])
        .order("data_trabalho", { ascending: false }),
    ]);
    const m = meRes.data;
    if (m) {
      const isPj = m.tipo_pessoa === "pj" || (m.cnpj && String(m.cnpj).trim().length > 0);
      setMe({ id: m.id, nome: m.nome_completo, cnpj: m.cnpj ?? null, tipo_pessoa: isPj ? "pj" : "pf" });
    }
    const list = (ofRes.data ?? []) as Oferta[];
    setOfertas(list);
    const ids = Array.from(new Set(list.map(o => o.empresa_id)));
    if (ids.length) {
      const { data: emp } = await sb.from("empresas").select("id, nome_fantasia, razao_social").in("id", ids);
      const map: Record<string, string> = {};
      (emp ?? []).forEach((e: any) => { map[e.id] = e.nome_fantasia || e.razao_social; });
      setEmpresas(map);
    }
    // load entregas to get nota_fiscal_url per oferta
    const ofIds = list.map(o => o.id);
    if (ofIds.length) {
      const { data: ents } = await sb.from("entregas")
        .select("id, oferta_id, nota_fiscal_url").in("oferta_id", ofIds);
      const em: Record<string, { id: string; nota_fiscal_url: string | null }> = {};
      (ents ?? []).forEach((e: any) => { em[e.oferta_id] = { id: e.id, nota_fiscal_url: e.nota_fiscal_url }; });
      setEntregas(em);
    }
    // load pagamentos of this entregador (used by PJ "Informar NF")
    const { data: pgs } = await sb.from("pagamentos")
      .select("id, valor_total, data_pagamento, nf_numero, empresa_id")
      .eq("entregador_id", user.id)
      .order("data_pagamento", { ascending: false });
    setPagamentos((pgs ?? []) as any);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel("ganhos-entregador")
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, []);

  const range = useMemo(() => rangeOf(period, custom), [period, custom]);
  const filtered = useMemo(() =>
    ofertas.filter(o => {
      if (!o.data_trabalho) return false;
      return o.data_trabalho >= range.from.slice(0,10) && o.data_trabalho <= range.to.slice(0,10);
    }), [ofertas, range]);

  const aReceber = filtered.filter(o => o.payment_status === "pending").reduce((s,o) => s + Number(o.valor||0), 0);
  const recebidoMes = filtered.filter(o => o.payment_status === "paid").reduce((s,o) => s + Number(o.valor||0), 0);
  const totalAno = ofertas.filter(o => {
    const y = o.data_trabalho?.slice(0,4); return y === String(new Date().getFullYear()) && o.payment_status === "paid";
  }).reduce((s,o) => s + Number(o.valor||0), 0);
  const mediaRota = filtered.length ? filtered.reduce((s,o) => s + Number(o.valor||0), 0) / filtered.length : 0;

  // Compare with last month
  const now = new Date();
  const thisMonth = ofertas.filter(o => {
    const d = o.data_trabalho ? new Date(o.data_trabalho) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s,o) => s + Number(o.valor||0), 0);
  const lastMonth = ofertas.filter(o => {
    const d = o.data_trabalho ? new Date(o.data_trabalho) : null;
    const lm = new Date(now.getFullYear(), now.getMonth()-1, 1);
    return d && d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).reduce((s,o) => s + Number(o.valor||0), 0);
  const variation = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  // Group by week
  const byWeek = useMemo(() => {
    const m = new Map<string, Oferta[]>();
    filtered.forEach(o => {
      if (!o.data_trabalho) return;
      const d = new Date(o.data_trabalho);
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${week}`;
      const arr = m.get(key) ?? []; arr.push(o); m.set(key, arr);
    });
    return Array.from(m.entries()).sort((a,b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

  const isPj = me?.tipo_pessoa === "pj";

  async function downloadDre() {
    const list = filtered.filter(o => o.payment_status === "paid");
    const rows: any[] = list.map(o => ({
      Data: o.data_trabalho ?? "",
      Empresa: empresas[o.empresa_id] ?? "",
      Titulo: o.titulo,
      Valor: Number(o.valor || 0),
    }));
    const totalReceita = rows.reduce((s, r) => s + Number(r.Valor || 0), 0);
    const iss = isPj ? totalReceita * 0.05 : 0;
    const inss = !isPj ? totalReceita * 0.11 : 0;
    const liquido = totalReceita - iss - inss;
    rows.push({});
    rows.push({ Data: "TOTAL RECEITAS", Valor: totalReceita });
    if (isPj) rows.push({ Data: "ISS (estimado 5%)", Valor: -iss });
    if (!isPj) rows.push({ Data: "INSS (estimado 11%)", Valor: -inss });
    rows.push({ Data: "RESULTADO LÍQUIDO ESTIMADO", Valor: liquido });
    rows.push({});
    rows.push({ Data: "Obs: Esta é apenas uma estimativa. Consulte um contador." });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "DRE");
    XLSX.writeFile(wb, `dre-${me?.nome ?? "extrato"}-${new Date().toISOString().slice(0,7)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      {/* Situação fiscal */}
      {me && (
        <Card className={cn("border-2", isPj ? "border-blue-200 bg-blue-50" : "border-muted bg-muted/30")}>
          <CardContent className="p-4 flex items-start gap-3">
            <Receipt className={cn("h-5 w-5 mt-0.5 shrink-0", isPj ? "text-blue-600" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Situação fiscal</p>
              {isPj ? (
                <>
                  <p className="text-xs mt-1">✅ Você é <strong>PJ</strong> — lembre-se de emitir NF para pagamentos recebidos.</p>
                  <Button size="sm" variant="link" className="p-0 h-auto mt-1" onClick={() => setShowHowToNf(true)}>
                    Como emitir NF →
                  </Button>
                  {(() => {
                    const now = new Date();
                    const y = now.getFullYear(), m = now.getMonth();
                    const pending = pagamentos.filter(p => {
                      if (p.nf_numero) return false;
                      const d = new Date(p.data_pagamento);
                      return d.getFullYear() === y && d.getMonth() === m;
                    });
                    if (pending.length === 0) return null;
                    return (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[11px] font-medium text-blue-900">
                          Pagamentos deste mês sem NF ({pending.length}):
                        </p>
                        {pending.map(p => (
                          <div key={p.id} className="flex items-center justify-between gap-2 bg-white/60 rounded-md border border-blue-100 p-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {empresas[p.empresa_id] ?? "Empresa"} · {brl(Number(p.valor_total))}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(p.data_pagamento).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => setInformarNf({ id: p.id, valor: Number(p.valor_total) })}>
                              Informar NF
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  <p className="text-xs mt-1">
                    ℹ️ Você é <strong>PF</strong> — pagamentos acima de <strong>R$ 1.903,98/mês</strong> podem estar sujeitos a IR. Consulte um contador.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard color="orange" label="A receber" value={brl(aReceber)} hint="Aguardando confirmação" icon={Clock} />
        <SummaryCard color="green" label="Recebido este mês" value={brl(recebidoMes)} icon={CheckCircle2} />
        <SummaryCard color="blue" label="Total do ano" value={brl(totalAno)} icon={Wallet} />
        <SummaryCard color="purple" label="Média por rota" value={brl(mediaRota)} icon={TrendingUp} />
      </div>

      <Card><CardContent className="pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
          <span className={cn("text-xs", variation >= 0 ? "text-emerald-600" : "text-red-600")}>
            {brl(thisMonth)} vs {brl(lastMonth)} ({variation >= 0 ? "+" : ""}{variation}%)
          </span>
        </div>
        <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
          <div className="h-full bg-primary"
            style={{ width: `${Math.min(100, lastMonth > 0 ? (thisMonth/Math.max(thisMonth,lastMonth))*100 : 100)}%` }} />
        </div>
      </CardContent></Card>

      <div className="flex flex-wrap gap-2 items-center">
        {([["semana","Esta semana"],["mes","Este mês"],["mes_ant","Mês anterior"],["custom","Personalizado"]] as [PeriodKey,string][]).map(([k,l]) => (
          <Chip key={k} active={period===k} onClick={() => setPeriod(k)}>{l}</Chip>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={downloadDre}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />Baixar DRE
        </Button>
      </div>
      {period === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={custom.from} onChange={e => setCustom(p => ({...p, from: e.target.value}))} />
          <Input type="date" value={custom.to} onChange={e => setCustom(p => ({...p, to: e.target.value}))} />
        </div>
      )}

      {byWeek.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-3 h-10 w-10" />Sem ganhos no período
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {byWeek.map(([key, items]) => {
            const total = items.reduce((s,o) => s + Number(o.valor||0), 0);
            return (
              <div key={key} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{key} · {brl(total)}</p>
                {items.map(o => {
                  const ent = entregas[o.id];
                  const nfNeeded = o.exige_nota_fiscal && o.payment_status === "paid";
                  const nfSent = !!ent?.nota_fiscal_url;
                  return (
                  <Card key={o.id} className="hover:elev-2">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3 cursor-pointer"
                        onClick={() => o.payment_status === "paid" && setReceipt(o)}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{o.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {empresas[o.empresa_id] ?? "Empresa"} ·{" "}
                            {o.data_trabalho ? new Date(o.data_trabalho).toLocaleDateString("pt-BR") : "—"}
                            {o.quantidade_pacotes ? ` · ${o.quantidade_pacotes} pac.` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary">{brl(Number(o.valor||0))}</p>
                          <Badge variant={o.payment_status==="paid"?"secondary":"outline"} className="text-[10px]">
                            {o.payment_status==="paid"?"Pago":"Pendente"}
                          </Badge>
                        </div>
                      </div>
                      {nfNeeded && (
                        <div className="mt-2 pt-2 border-t flex items-center justify-between gap-2">
                          {nfSent ? (
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                              NF enviada ✅
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                              <AlertTriangle className="h-3 w-3 mr-0.5" />NF pendente
                            </Badge>
                          )}
                          {!nfSent && ent && (
                            <Button size="sm" variant="outline"
                              onClick={() => setNfUploadFor({ ofertaId: o.id, entregaId: ent.id })}>
                              <Receipt className="h-3 w-3 mr-1" />Enviar NF
                            </Button>
                          )}
                          {nfSent && ent?.nota_fiscal_url && (
                            <a href={ent.nota_fiscal_url} target="_blank" rel="noreferrer"
                              className="text-xs text-primary underline">Ver NF</a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {receipt && (
        <ReceiptDialog oferta={receipt} empresa={empresas[receipt.empresa_id] ?? "Empresa"}
          onClose={() => setReceipt(null)} />
      )}

      {nfUploadFor && me && (
        <NfUploadDialog target={nfUploadFor} entregadorId={me.id}
          onClose={() => setNfUploadFor(null)}
          onDone={() => { setNfUploadFor(null); load(); }} />
      )}

      <Dialog open={showHowToNf} onOpenChange={setShowHowToNf}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Como emitir nota fiscal (PJ)</DialogTitle>
            <DialogDescription>Passos básicos — consulte seu contador.</DialogDescription>
          </DialogHeader>
          <ol className="text-sm space-y-2 list-decimal pl-5">
            <li>Acesse o portal da prefeitura da sua cidade (NFS-e).</li>
            <li>Faça login com certificado digital ou senha web.</li>
            <li>Selecione "Emitir NFS-e" e informe o CNPJ do tomador (a empresa).</li>
            <li>Descreva o serviço (ex: "Serviço de entrega de pacotes").</li>
            <li>Informe o valor e a alíquota de ISS da sua cidade (geralmente 2% a 5%).</li>
            <li>Emita a nota e baixe o PDF.</li>
            <li>Volte aqui e anexe o PDF clicando em "Enviar NF" na rota correspondente.</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Esta orientação é genérica. Cada cidade tem regras próprias. Procure um contador.
          </p>
        </DialogContent>
      </Dialog>

      <InformarNfDialog
        open={!!informarNf}
        valor={informarNf?.valor ?? 0}
        onClose={() => setInformarNf(null)}
        onSave={async (numero) => {
          if (!informarNf) return;
          const { error } = await (supabase as any).from("pagamentos")
            .update({ nf_numero: numero }).eq("id", informarNf.id);
          if (error) return toast.error(error.message);
          toast.success("NF informada");
          setInformarNf(null);
          load();
        }}
      />
    </div>
  );
}

function ReceiptDialog({ oferta, empresa, onClose }: { oferta: Oferta; empresa: string; onClose: () => void }) {
  const [pix, setPix] = useState<string>("");
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any).from("entregadores").select("pix_chave").eq("id", user.id).maybeSingle();
      setPix(data?.pix_chave ?? "");
    })();
  }, []);
  function share() {
    const txt = `Comprovante: ${oferta.titulo} · ${brl(Number(oferta.valor||0))} pago por ${empresa}`;
    if (navigator.share) navigator.share({ title: "Comprovante", text: txt }).catch(() => {});
    else { navigator.clipboard.writeText(txt); toast.success("Copiado"); }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Comprovante</DialogTitle></DialogHeader>
        <div className="rounded-xl border bg-emerald-500/5 p-4 space-y-2 text-sm">
          <p className="text-center font-bold text-emerald-600">✅ PAGO</p>
          <div className="border-t pt-2 space-y-1">
            <p className="font-semibold">{oferta.titulo}</p>
            <p className="text-xs text-muted-foreground">Empresa: {empresa}</p>
            <p className="text-xs text-muted-foreground">Entrega: {oferta.data_trabalho ? new Date(oferta.data_trabalho).toLocaleDateString("pt-BR") : "—"}</p>
            <p className="text-xs text-muted-foreground">Pagamento: {oferta.payment_date ? new Date(oferta.payment_date).toLocaleDateString("pt-BR") : "—"}</p>
            {oferta.quantidade_pacotes && (
              <p className="text-xs">Pacotes: {oferta.quantidade_pacotes} × {brl(Number(oferta.valor_por_pacote||0))}</p>
            )}
          </div>
          <div className="border-t pt-2 text-center">
            <p className="text-xs text-muted-foreground">TOTAL</p>
            <p className="text-2xl font-bold text-primary">{brl(Number(oferta.valor||0))}</p>
          </div>
          {pix && <p className="text-xs text-center text-muted-foreground">PIX: {pix}</p>}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => window.print()}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" onClick={share}><Share2 className="h-4 w-4 mr-1" />Compartilhar</Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NfUploadDialog({ target, entregadorId, onClose, onDone }: {
  target: { ofertaId: string; entregaId: string };
  entregadorId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function upload() {
    if (!file) return toast.error("Selecione o PDF da nota fiscal.");
    setSaving(true);
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${entregadorId}/${target.entregaId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("notas-fiscais")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { setSaving(false); return toast.error("Falha no upload: " + upErr.message); }
    const { data: signed } = await supabase.storage.from("notas-fiscais")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const url = signed?.signedUrl ?? null;
    const { error } = await (supabase as any).from("entregas")
      .update({ nota_fiscal_url: url }).eq("id", target.entregaId);
    if (error) { setSaving(false); return toast.error(error.message); }
    toast.success("Nota fiscal enviada!");
    setSaving(false);
    onDone();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enviar nota fiscal</DialogTitle>
          <DialogDescription>Anexe o PDF da NFS-e emitida.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="file" accept="application/pdf"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={upload} disabled={saving || !file}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
