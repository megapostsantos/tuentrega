import { sendEmail, emailRedefinirSenha } from "../src/server/email.ts";
let fail = 0;
const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };

delete process.env.RESEND_API_KEY;
ok("sem chave não envia e não quebra", (await sendEmail({ to: "a@b.com", subject: "x", html: "y" })) === false);

process.env.RESEND_API_KEY = "re_test";
let chamada: any = null;
(globalThis as any).fetch = async (url: string, init: any) => { chamada = { url, init }; return new Response("{}", { status: 200 }); };
const r = await sendEmail({ to: "ana@x.com", subject: "Assunto", html: "<b>oi</b>" });
ok("com chave envia via Resend", r === true && chamada.url === "https://api.resend.com/emails", chamada);
const body = JSON.parse(chamada.init.body);
ok("payload correto", body.to[0] === "ana@x.com" && body.subject === "Assunto" && /TuEntrega/.test(body.from), body);
ok("autorização Bearer", chamada.init.headers.Authorization === "Bearer re_test", chamada.init.headers);
(globalThis as any).fetch = async () => new Response("erro", { status: 422 });
ok("erro do provedor retorna false", (await sendEmail({ to: "a@b.com", subject: "x", html: "y" })) === false);
const html = emailRedefinirSenha("<script>Ana</script>", "https://x/y?token=1");
ok("e-mail traz o link e escapa o nome", html.includes("https://x/y?token=1") && !html.includes("<script>"), html);
process.exit(fail ? 1 : 0);
