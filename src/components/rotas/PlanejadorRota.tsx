import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Route, Navigation, MapPinned } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { localizarCeps, formataCep, soDigitos } from "@/lib/cep";
import { ordenarParadas, estimarMinutos, formatDuration, haversineDistance } from "@/lib/route-optimizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ParadaPlan = {
  id: string; numero_pacote: number; status: string; ordem_otimizada: number | null;
  endereco_entrega: string | null; cep?: string | null; lat?: number | string | null; lng?: number | string | null;
};

const BASE_ORDEM = 100000;
const n = (v: unknown) => { const x = Number(v); return v != null && v !== "" && Number.isFinite(x) ? x : null; };

/** Texto que o Waze/Google entendem: endereço + CEP (a coordenada do CEP é só aproximada). */
function destinoTexto(p: ParadaPlan): string | null {
  const partes = [p.endereco_entrega?.trim(), p.cep ? formataCep(p.cep) : null].filter(Boolean);
  return partes.length ? `${partes.join(", ")}, Brasil` : null;
}
export function linkWaze(p: ParadaPlan): string {
  const t = destinoTexto(p); const lat = n(p.lat), lng = n(p.lng);
  return t ? `https://waze.com/ul?q=${encodeURIComponent(t)}&navigate=yes` : `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}
export function linkGoogle(p: ParadaPlan): string {
  const t = destinoTexto(p); const lat = n(p.lat), lng = n(p.lng);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t ?? `${lat},${lng}`)}&travelmode=driving`;
}
export function linkGoogleTrecho(ps: ParadaPlan[]): string {
  const alvo = (p: ParadaPlan) => destinoTexto(p) ?? `${n(p.lat)},${n(p.lng)}`;
  const ult = ps[ps.length - 1];
  const via = ps.slice(0, -1).map(alvo).join("|");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(alvo(ult))}${via ? `&waypoints=${encodeURIComponent(via)}` : ""}&travelmode=driving`;
}

function posicaoAtual(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), () => ok(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  });
}

/** Planejador: ordena as paradas pendentes pelo melhor caminho (a partir do CEP) e abre o GPS. */
export function PlanejadorRota({ ofertaId, pacotes, onSalvo }: { ofertaId: string; pacotes: ParadaPlan[]; onSalvo: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const pendentes = useMemo(
    () => pacotes.filter((p) => p.status === "pending").sort((a, b) => (a.ordem_otimizada ?? a.numero_pacote) - (b.ordem_otimizada ?? b.numero_pacote)),
    [pacotes],
  );
  const comCep = pendentes.filter((p) => soDigitos(p.cep).length === 8 || (n(p.lat) != null && n(p.lng) != null)).length;
  const otimizada = pendentes.length > 0 && pendentes.every((p) => (p.ordem_otimizada ?? 0) >= BASE_ORDEM);
  const resumo = useMemo(() => {
    const pts = pendentes.filter((p) => n(p.lat) != null && n(p.lng) != null);
    if (!otimizada || pts.length < 2) return null;
    let km = 0;
    for (let i = 1; i < pts.length; i++) km += haversineDistance(n(pts[i - 1].lat)!, n(pts[i - 1].lng)!, n(pts[i].lat)!, n(pts[i].lng)!);
    return { km, min: estimarMinutos(km, pendentes.length) };
  }, [pendentes, otimizada]);

  if (pendentes.length === 0) return null;

  async function otimizar() {
    if (comCep === 0) return toast.error("Estas paradas não têm CEP. Peça à empresa para importar a planilha com CEP.");
    setBusy(true);
    try {
      setMsg("Pegando sua localização…");
      const eu = await posicaoAtual();
      const faltam = pendentes.filter((p) => (n(p.lat) == null || n(p.lng) == null) && soDigitos(p.cep).length === 8);
      const mapa = faltam.length ? await localizarCeps(faltam.map((p) => p.cep!), (f, t) => setMsg(`Localizando CEPs… ${f}/${t}`)) : new Map();
      const pontos = pendentes.map((p) => {
        const lat = n(p.lat), lng = n(p.lng);
        if (lat != null && lng != null) return { p, lat, lng };
        const c = mapa.get(soDigitos(p.cep));
        return c ? { p, lat: c.lat, lng: c.lng } : { p, lat: NaN, lng: NaN };
      });
      const achados = pontos.filter((x) => Number.isFinite(x.lat));
      const perdidos = pontos.filter((x) => !Number.isFinite(x.lat));
      if (achados.length === 0) throw new Error("Não consegui localizar nenhum CEP. Verifique a internet e tente de novo.");
      setMsg("Calculando o melhor caminho…");
      const origem = eu ?? { lat: achados[0].lat, lng: achados[0].lng };
      const { ordem } = ordenarParadas(origem, achados);
      let prev = origem;
      const itens = [
        ...ordem.map((x, i) => { const d = haversineDistance(prev.lat, prev.lng, x.lat, x.lng) * 1000; prev = x; return { id: x.p.id, ordem: BASE_ORDEM + i + 1, lat: x.lat, lng: x.lng, dist: d }; }),
        ...perdidos.map((x, i) => ({ id: x.p.id, ordem: BASE_ORDEM + ordem.length + i + 1, lat: null, lng: null, dist: null })),
      ];
      const { error } = await (supabase as any).rpc("salvar_ordem_rota", { oferta_id: ofertaId, itens });
      if (error) throw new Error(error.message);
      toast.success(`Rota organizada: ${ordem.length} paradas${perdidos.length ? ` (${perdidos.length} sem localização ficaram no fim)` : ""}.`);
      onSalvo();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível organizar a rota.");
    } finally { setBusy(false); setMsg(""); }
  }

  const proxima = otimizada ? pendentes[0] : null;
  const trecho = otimizada ? pendentes.slice(0, 9) : [];
  return (
    <Card className="border-primary/40">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold"><Route className="h-4 w-4" />Planejador de rota</div>
            <p className="text-xs text-muted-foreground">
              {resumo ? `${pendentes.length} paradas · ~${resumo.km.toFixed(1)} km · cerca de ${formatDuration(resumo.min)} no total` : `Ordena as ${pendentes.length} paradas pelo melhor caminho usando o CEP.`}
            </p>
          </div>
          <Button size="sm" onClick={otimizar} disabled={busy || comCep === 0}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Route className="mr-1 h-4 w-4" />}{otimizada ? "Refazer" : "Organizar rota"}
          </Button>
        </div>
        {busy && <p className="text-xs text-muted-foreground">{msg}</p>}
        {comCep === 0 && <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">Estas paradas não têm CEP, então não dá para ordenar. A empresa pode importar a planilha com CEP.</p>}
        {proxima && (
          <div className="space-y-2 rounded-lg bg-muted/60 p-2">
            <div className="text-xs text-muted-foreground">Próxima parada</div>
            <div className="text-sm font-medium leading-tight">{proxima.endereco_entrega ?? "Sem endereço"}{proxima.cep ? ` · CEP ${formataCep(proxima.cep)}` : ""}</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild><a href={linkWaze(proxima)} target="_blank" rel="noreferrer"><Navigation className="mr-1 h-4 w-4" />Waze</a></Button>
              <Button size="sm" variant="outline" asChild><a href={linkGoogle(proxima)} target="_blank" rel="noreferrer"><Navigation className="mr-1 h-4 w-4" />Google Maps</a></Button>
              {trecho.length > 1 && <Button size="sm" variant="outline" asChild><a href={linkGoogleTrecho(trecho)} target="_blank" rel="noreferrer"><MapPinned className="mr-1 h-4 w-4" />Próximas {trecho.length} no Maps</a></Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
