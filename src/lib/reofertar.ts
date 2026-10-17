import { supabase } from "@/integrations/supabase/client";

// Entregador recusa uma rota que lhe foi atribuída (regras e penalidade são aplicadas no servidor).
export async function recusarRotaAtribuida(p: { ofertaId: string; motivo: string }): Promise<{ penalizado: boolean; pontos: number }> {
  const { data, error } = await (supabase as any).rpc("recusar_rota", { _oferta_id: p.ofertaId, _motivo: p.motivo });
  if (error) throw new Error(error.message);
  return data as { penalizado: boolean; pontos: number };
}

// Empresa tira o entregador da rota (não compareceu, desistiu...) e a oferece de novo a outros.
export async function reofertarRota(p: { ofertaId: string; empresaId: string; entregadorId: string; rotaId?: string | null; motivo: string }) {
  const sb = supabase as any;
  const { error: e1 } = await sb.from("ofertas_recusas").insert({
    oferta_id: p.ofertaId, empresa_id: p.empresaId, entregador_id: p.entregadorId, origem: "empresa", motivo: p.motivo,
  });
  if (e1) throw new Error(e1.message);
  await sb.from("alocacoes").update({ status: "removida" }).eq("oferta_id", p.ofertaId).eq("entregador_id", p.entregadorId);
  const { error: e3 } = await sb.from("ofertas").update({ status: "open", entregador_id: null, atribuida_em: null }).eq("id", p.ofertaId);
  if (e3) throw new Error(e3.message);
}
