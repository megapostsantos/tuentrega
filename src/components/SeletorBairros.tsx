import { useEffect, useMemo, useState } from "react";
import { Loader2, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UFS, cidadesDaUF, bairrosDaCidade, rotuloBairro, semAcento } from "@/lib/localidades";

/** Escolhe estado → cidade (lista do IBGE) → bairros (sugestões do mapa + digitação livre). */
export function SeletorBairros({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [uf, setUf] = useState("SP");
  const [cidades, setCidades] = useState<{ id: number; nome: string }[]>([]);
  const [cidade, setCidade] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let vivo = true;
    setCidades([]); setCidade("");
    cidadesDaUF(uf).then((l) => vivo && setCidades(l)).catch(() => {});
    return () => { vivo = false; };
  }, [uf]);

  useEffect(() => {
    if (!cidade) { setSugestoes([]); return; }
    let vivo = true;
    setCarregando(true);
    bairrosDaCidade(cidade, uf).then((l) => vivo && setSugestoes(l)).catch(() => vivo && setSugestoes([])).finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [cidade, uf]);

  const listaCidades = useMemo(() => {
    const f = semAcento(filtroCidade);
    return (f ? cidades.filter((c) => semAcento(c.nome).includes(f)) : cidades).slice(0, 200);
  }, [cidades, filtroCidade]);

  const sel = new Set(value.map(semAcento));
  const alterna = (b: string) => {
    const r = rotuloBairro(b, cidade, uf);
    onChange(sel.has(semAcento(r)) ? value.filter((x) => semAcento(x) !== semAcento(r)) : [...value, r]);
  };
  const filtradas = sugestoes.filter((b) => !busca || semAcento(b).includes(semAcento(busca)));
  const podeAdicionar = !!cidade && busca.trim().length > 1 && !sugestoes.some((b) => semAcento(b) === semAcento(busca));

  return (
    <div className="space-y-3">
      <Label>Onde atua (cidade e bairros)</Label>
      <div className="grid grid-cols-[80px_1fr] gap-2">
        <Select value={uf} onValueChange={setUf}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={cidade} onValueChange={setCidade}>
          <SelectTrigger><SelectValue placeholder={cidades.length ? "Escolha a cidade" : "Carregando cidades…"} /></SelectTrigger>
          <SelectContent>
            <div className="p-2"><Input value={filtroCidade} onChange={(e) => setFiltroCidade(e.target.value)} placeholder="Buscar cidade" onKeyDown={(e) => e.stopPropagation()} /></div>
            {listaCidades.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {cidade && (
        <div className="space-y-2">
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={`Buscar ou digitar bairro de ${cidade}`} />
          {carregando && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Buscando bairros no mapa…</p>}
          {podeAdicionar && (
            <Button type="button" size="sm" variant="outline" onClick={() => { alterna(busca.trim()); setBusca(""); }}>
              <Plus className="mr-1 h-4 w-4" />Adicionar "{busca.trim()}"
            </Button>
          )}
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {filtradas.slice(0, 120).map((b) => {
              const on = sel.has(semAcento(rotuloBairro(b, cidade, uf)));
              return (
                <button key={b} type="button" onClick={() => alterna(b)}
                  className={`rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{b}</button>
              );
            })}
          </div>
          {!carregando && sugestoes.length === 0 && <p className="text-xs text-muted-foreground">Não achamos a lista desta cidade no mapa. Digite o nome do bairro e toque em Adicionar.</p>}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-md border p-2">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-xs">
              {v}<button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label="Remover"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
