import { supabase } from "@/integrations/supabase/client";

export type WhatsAppTipo = "alocacao" | "distribuicao" | "confirmacao" | "recusa" | "publicacao";
export type DestinatarioTipo = "dispatcher" | "entregador" | "empresa";

const APP_BASE = typeof window !== "undefined" ? window.location.origin : "https://tuentrega.lovable.app";

const brl = (n: number) => `R$ ${Number(n || 0).toFixed(2).replace(".", ",")}`;

export const WA_TEMPLATES = {
  alocacao: (p: { dispatcherName: string; companyName: string; packages: number; stops: number; price: number; total: number; allocId: string; hours?: number }) =>
`TuEntrega 📦
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
`TuEntrega 🔒
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
`TuEntrega ✅
Olá ${p.dispatcherName}!

Suas rotas foram publicadas!

${p.lines.join("\n")}

Acompanhe em tempo real:
${APP_BASE}/pacotes`,

  confirmacao: (p: { dispatcherName: string; memberName: string; date: string; packages: number }) =>
`TuEntrega ✅
Olá ${p.dispatcherName}!

${p.memberName} confirmou presença!

📅 Data: ${p.date}
👤 Membro: ${p.memberName}
📦 Pacotes est: ~${p.packages}
✅ Status: Confirmado

${APP_BASE}/agenda`,

  recusa: (p: { dispatcherName: string; memberName: string; date: string }) =>
`TuEntrega ❌
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
