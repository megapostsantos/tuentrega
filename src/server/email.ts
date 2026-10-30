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

export function emailRedefinirSenha(nome: string, url: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
  <h2 style="color:#14121F">Redefinir sua senha</h2>
  <p>Olá, ${nome.replace(/[<>&]/g, "")}. Recebemos um pedido para redefinir a senha da sua conta TuEntrega.</p>
  <p><a href="${url}" style="display:inline-block;background:#7C5CFF;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Criar nova senha</a></p>
  <p style="color:#555;font-size:13px">O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
</div>`;
}
