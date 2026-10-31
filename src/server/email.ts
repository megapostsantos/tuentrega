// Envio de e-mail via Resend (https://resend.com). Sem RESEND_API_KEY não envia nada (apenas registra no log).
export async function sendEmail(p: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY ausente — e-mail não enviado:", p.subject, "->", p.to);
    return false;
  }
  const from = process.env.EMAIL_FROM || "TuEntrega <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [p.to], subject: p.subject, html: p.html }),
    });
    if (!res.ok) console.error("[email] Resend respondeu", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[email] falha no envio:", (e as Error)?.message);
    return false;
  }
}

/** Diagnóstico: envia um e-mail de teste e devolve exatamente o que o Resend respondeu. */
export async function testarEmail(to: string): Promise<{ chave: boolean; remetente: string; ok: boolean; status: number | null; resposta: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "TuEntrega <onboarding@resend.dev>";
  if (!key) return { chave: false, remetente: from, ok: false, status: null, resposta: "RESEND_API_KEY não está configurada no Cloudflare." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: "Teste de e-mail — TuEntrega", html: "<p>Se você recebeu esta mensagem, o envio de e-mails do TuEntrega está funcionando. ✅</p>" }),
    });
    return { chave: true, remetente: from, ok: res.ok, status: res.status, resposta: (await res.text()).slice(0, 400) };
  } catch (e) {
    return { chave: true, remetente: from, ok: false, status: null, resposta: `Falha de rede: ${(e as Error)?.message}` };
  }
}

export function emailRedefinirSenha(nome: string, url: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
  <h2 style="color:#0B0B0D">Redefinir sua senha</h2>
  <p>Olá, ${nome.replace(/[<>&]/g, "")}. Recebemos um pedido para redefinir a senha da sua conta TuEntrega.</p>
  <p><a href="${url}" style="display:inline-block;background:#FFB700;color:#0B0B0D;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Criar nova senha</a></p>
  <p style="color:#555;font-size:13px">O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
</div>`;
}
