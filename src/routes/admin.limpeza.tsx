import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/limpeza")({ component: LimpezaPage });

type Usuario = { id: string; name: string | null; email: string; role: string | null; ofertas: number };
type Previa = { contagens: Record<string, number>; usuarios: Usuario[] };

function LimpezaPage() {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [modo, setModo] = useState<"operacional" | "contas">("operacional");
  const [manter, setManter] = useState<Set<string>>(new Set());
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);

  async function carregar() {
    const r = await fetch("/api/admin/limpeza", { credentials: "same-origin" });
    if (!r.ok) return toast.error("Sem permissão (entre como admin).");
    const j: Previa = await r.json();
    setPrevia(j);
    setManter(new Set(j.usuarios.filter((u) => u.role === "admin").map((u) => u.id)));
  }
  useEffect(() => { carregar(); }, []);

  async function executar() {
    if (conf !== "LIMPAR") return toast.error('Digite LIMPAR para confirmar.');
    setBusy(true);
    const r = await fetch("/api/admin/limpeza", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo, manter: [...manter], confirmar: conf }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast.error(j?.error ?? "Falha na limpeza");
    toast.success(modo === "contas" ? `Pronto. ${j.contasRemovidas} conta(s) removida(s) e dados limpos.` : "Pronto. Dados de operação limpos.");
    setConf("");
    carregar();
  }

  const total = previa ? Object.values(previa.contagens).reduce((s, n) => s + n, 0) : 0;
  const alvo = previa ? previa.usuarios.filter((u) => !manter.has(u.id) && u.role !== "admin").length : 0;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader title="Limpar dados de teste" description="Apaga o que foi criado nos testes para começar do zero. Não dá para desfazer." />
      {!previa ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">O que existe hoje</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm">
              {total === 0 ? <span className="text-muted-foreground">Nenhum dado de operação.</span> :
                Object.entries(previa.contagens).map(([t, n]) => <Badge key={t} variant="secondary">{t.replace(/_/g, " ")}: {n}</Badge>)}
              <Badge variant="outline">contas: {previa.usuarios.length}</Badge>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { v: "operacional", t: "Só a operação", d: "Apaga operações, rotas, ofertas, pacotes, pagamentos, notas e histórico. Mantém todas as contas e cadastros." },
              { v: "contas", t: "Operação + contas", d: "Além disso, apaga as contas que você NÃO marcar para manter (admin sempre fica)." },
            ] as const).map((o) => (
              <button key={o.v} type="button" onClick={() => setModo(o.v)}
                className={`rounded-lg border-2 p-4 text-left ${modo === o.v ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="font-semibold">{o.t}</div>
                <p className="mt-1 text-xs text-muted-foreground">{o.d}</p>
              </button>
            ))}
          </div>

          {modo === "contas" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Quais contas manter?</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {previa.usuarios.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                    <Checkbox checked={manter.has(u.id)} disabled={u.role === "admin"}
                      onCheckedChange={() => setManter((s) => { const n = new Set(s); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n; })} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{u.name || u.email}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email} · {u.role}</div>
                    </div>
                    {!manter.has(u.id) && u.role !== "admin" && <Badge variant="destructive">será apagada</Badge>}
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-red-300">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2 text-sm text-red-700">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {modo === "contas" ? `Vai apagar ${alvo} conta(s) e todos os dados de operação.` : "Vai apagar todos os dados de operação."}{" "}
                  Faça isso só antes de começar a usar de verdade. Os pontos de confiança dos entregadores voltam a 100.
                </p>
              </div>
              <Input placeholder='Digite LIMPAR para confirmar' value={conf} onChange={(e) => setConf(e.target.value)} />
              <Button variant="destructive" disabled={busy || conf !== "LIMPAR"} onClick={executar}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Limpar agora
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
