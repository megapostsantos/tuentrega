import { supabase } from "@/integrations/supabase/client";

// Entregador recusa uma rota que lhe foi atribuída: ela volta ao mercado e não é mais oferecida a ele.
export async function recusarRotaAtribuida(p: { ofertaId: string; empresaId: string; entregadorId: string; motivo: string }) {
  const sb = supabase as any;
  const { error: e1 } = await sb.from("ofertas_recusas").insert({
    oferta_id: p.ofertaId, empresa_id: p.empresaId, entregador_id: p.entregadorId, origem: "entregador", motivo: p.motivo,
  });
  if (e1) throw new Error(e1.message);
  await sb.from("alocacoes").update({ status: "recusada" }).eq("oferta_id", p.ofertaId).eq("entregador_id", p.entregadorId);
  const { error: e3 } = await sb.from("ofertas")
    .update({ status: "open", entregador_id: null })
    .eq("id", p.ofertaId).eq("entregador_id", p.entregadorId).eq("status", "accepted");
  if (e3) throw new Error(e3.message);
}

// Empresa tira o entregador da rota (não compareceu, desistiu...) e a oferece de novo a outros.
export async function reofertarRota(p: { ofertaId: string; empresaId: string; entregadorId: string; rotaId?: string | null; motivo: string }) {
  const sb = supabase as any;
  const { error: e1 } = await sb.from("ofertas_recusas").insert({
    oferta_id: p.ofertaId, empresa_id: p.empresaId, entregador_id: p.entregadorId, origem: "empresa", motivo: p.motivo,
  });
  if (e1) throw new Error(e1.message);
  await sb.from("alocacoes").update({ status: "removida" }).eq("oferta_id", p.ofertaId).eq("entregador_id", p.entregadorId);
  const { error: e3 } = await sb.from("ofertas").update({ status: "open", entregador_id: null }).eq("id", p.ofertaId);
  if (e3) throw new Error(e3.message);
}
