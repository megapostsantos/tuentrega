import { supabase } from "@/integrations/supabase/client";

export type WhatsAppTipo = "alocacao" | "distribuicao" | "confirmacao" | "recusa" | "publicacao";
export type DestinatarioTipo = "dispatcher" | "entregador" | "empresa";

const APP_BASE = typeof window !== "undefined" ? window.location.origin : "https://bagenvios.lovable.app";

const brl = (n: number) => `R$ ${Number(n || 0).toFixed(2).replace(".", ",")}`;

export const WA_TEMPLATES = {
  alocacao: (p: { dispatcherName: string; companyName: string; packages: number; stops: number; price: number; total: number; allocId: string; hours?: number }) =>
`BAG Envios 📦
Olá ${p.dispatcherName}!

Você recebeu uma nova alocação!

🏢 Empresa: ${p.companyName}
📦 Pacotes: ${p.packages}
🗺️ Paradas: ${p.stops}
💰 Valor: ${brl(p.price)}/pacote
💵 Total: ${brl(p.total)}

Distribua entre seu time:
${APP_BASE}/pacotes/distribuir/${p.allocId}

Você tem ${p.hours ?? 4} horas para distribuir.`,

  distribuicao: (p: { memberName: string; dispatcherName: string; packages: number; stops: number; price: number; total: number; offerId: string; date?: string }) =>
`BAG Envios 🔒
Olá ${p.memberName}!

${p.dispatcherName} te enviou uma rota privada!

📦 Pacotes: ${p.packages}
🗺️ Paradas: ${p.stops}
💰 Valor: ${brl(p.price)}/pacote
💵 Total: ${brl(p.total)}
${p.date ? `\nData: ${p.date}` : ""}

Aceite agora:
${APP_BASE}/ofertas

Se não conseguir, avise rápido!`,

  publicacao: (p: { dispatcherName: string; lines: string[] }) =>
`BAG Envios ✅
Olá ${p.dispatcherName}!

Suas rotas foram publicadas!

${p.lines.join("\n")}

Acompanhe em tempo real:
${APP_BASE}/pacotes`,

  confirmacao: (p: { dispatcherName: string; memberName: string; date: string; packages: number }) =>
`BAG Envios ✅
Olá ${p.dispatcherName}!

${p.memberName} confirmou presença!

📅 Data: ${p.date}
👤 Membro: ${p.memberName}
📦 Pacotes est: ~${p.packages}
✅ Status: Confirmado

${APP_BASE}/agenda`,

  recusa: (p: { dispatcherName: string; memberName: string; date: string }) =>
`BAG Envios ❌
Olá ${p.dispatcherName}!

${p.memberName} recusou o agendamento.

📅 Data: ${p.date}
👤 Membro: ${p.memberName}
❌ Status: Recusado

Procure alguém para cobrir:
${APP_BASE}/time`,
};

interface NotifyArgs {
  recipientId: string;
  destinatarioTipo: DestinatarioTipo;
  tipo: WhatsAppTipo;
  telefone?: string | null;
  mensagem: string;
}

/**
 * Logs a WhatsApp notification to the database.
 * In dev: stored with status='logged' (no actual send).
 * In prod with provider configured: would dispatch via API and update status.
 */
export async function notifyWhatsApp(args: NotifyArgs) {
  const sb = supabase as any;
  // Console log for dev visibility
  if (import.meta.env.DEV) {
    console.info("[WA]", args.tipo, "→", args.telefone || args.recipientId, "\n" + args.mensagem);
  }
  const { error } = await sb.from("notificacoes_whatsapp").insert({
    recipient_id: args.recipientId,
    destinatario_tipo: args.destinatarioTipo,
    tipo: args.tipo,
    telefone: args.telefone ?? null,
    mensagem: args.mensagem,
    status: "logged",
  });
  if (error) console.warn("[WA] failed to log:", error.message);
}

export async function notifyWhatsAppBatch(items: NotifyArgs[]) {
  await Promise.all(items.map(notifyWhatsApp));
}

/* ============================================================
 * Destinatário (recipient) WhatsApp notifications
 * ============================================================ */

export type DestinatarioWaTipo = "saiu_para_entrega" | "entregue" | "tentativa_falha";

export const WA_DEST_TEMPLATES = {
  saiu_para_entrega: (p: { nome: string; numero: number | string; link: string }) =>
    `Olá ${p.nome}! Seu pedido #${p.numero} saiu para entrega.\nAcompanhe: ${p.link}`,
  entregue: (p: { nome: string; numero: number | string; horario: string; recebedor: string }) =>
    `✅ ${p.nome}, seu pedido #${p.numero} foi entregue às ${p.horario}.\nRecebedor: ${p.recebedor}`,
  tentativa_falha: (p: { nome: string; numero: number | string; motivo: string }) =>
    `⚠️ ${p.nome}, não conseguimos entregar seu pedido #${p.numero}.\nMotivo: ${p.motivo}. Entraremos em contato.`,
};

async function logDestNotification(pacoteId: string, tipo: DestinatarioWaTipo, mensagem: string, sent: boolean) {
  const sb = supabase as any;
  const { error } = await sb.from("notificacoes_destinatario").insert({
    pacote_id: pacoteId,
    tipo,
    mensagem,
    enviado_em: sent ? new Date().toISOString() : null,
    status: sent ? "enviado" : "pendente",
  });
  if (error) console.warn("[WA dest] log failed:", error.message);
}

/** Send a single destinatário notification for a specific package. */
export async function notifyDestinatarioPacote(pacoteId: string, tipo: DestinatarioWaTipo) {
  const sb = supabase as any;
  const { data: p, error } = await sb
    .from("entregas_pacotes")
    .select(
      "id, numero_pacote, destinatario_nome, destinatario_telefone, token_rastreamento, nome_recebedor, entregue_em, motivo_nao_entrega"
    )
    .eq("id", pacoteId)
    .maybeSingle();
  if (error || !p) return;
  if (!p.destinatario_telefone) return;

  const nome = (p.destinatario_nome || "cliente").split(" ")[0];
  let mensagem = "";
  if (tipo === "saiu_para_entrega") {
    const link = `${APP_BASE}/rastrear/${p.token_rastreamento}`;
    mensagem = WA_DEST_TEMPLATES.saiu_para_entrega({ nome, numero: p.numero_pacote, link });
  } else if (tipo === "entregue") {
    const horario = p.entregue_em
      ? new Date(p.entregue_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    mensagem = WA_DEST_TEMPLATES.entregue({
      nome,
      numero: p.numero_pacote,
      horario,
      recebedor: p.nome_recebedor || "—",
    });
  } else {
    mensagem = WA_DEST_TEMPLATES.tentativa_falha({
      nome,
      numero: p.numero_pacote,
      motivo: p.motivo_nao_entrega || "endereço não localizado",
    });
  }

  if (import.meta.env.DEV) {
    console.info("[WA dest]", tipo, "→", p.destinatario_telefone, "\n" + mensagem);
  }
  await logDestNotification(p.id, tipo, mensagem, true);
}

/** Send "saiu para entrega" to every package of an oferta that has a phone. */
export async function notifyDestinatarioOferta(ofertaId: string) {
  const sb = supabase as any;
  const { data: pacotes } = await sb
    .from("entregas_pacotes")
    .select("id")
    .eq("oferta_id", ofertaId)
    .not("destinatario_telefone", "is", null);
  if (!pacotes?.length) return;
  await Promise.all(
    pacotes.map((p: { id: string }) => notifyDestinatarioPacote(p.id, "saiu_para_entrega")),
  );
}
