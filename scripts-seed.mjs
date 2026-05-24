import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users = [
  { email: "lgramirodecampos@gmail.com", password: "123456",
    user_metadata: { role: "admin", full_name: "Luis Gustavo" } },
  { email: "empresa@tuentrega.com", password: "123456",
    user_metadata: { role: "empresa", full_name: "João Silva", company_name: "Logística Santos",
      razao_social: "Logística Santos", nome_fantasia: "Logística Santos",
      cnpj: "12.345.678/0001-90", responsavel: "João Silva", whatsapp: "(13) 99999-1111" } },
  { email: "entregador@tuentrega.com", password: "123456",
    user_metadata: { role: "entregador", full_name: "Carlos Souza", cpf: "123.456.789-09",
      whatsapp: "(13) 99999-2222", tipo_veiculo: "moto", placa: "ABC-1234",
      pix_tipo: "telefone", pix_chave: "(13) 99999-2222", banco: "Nubank",
      turnos: ["manha","tarde"], plataformas: [], bairros: [] } },
];

for (const u of users) {
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email, password: u.password, email_confirm: true, user_metadata: u.user_metadata,
  });
  console.log(u.email, error ? `ERROR: ${error.message}` : `OK ${data.user?.id}`);
}

const { error: upErr } = await sb.from("empresas").update({ plano: "pro" }).eq("cnpj", "12.345.678/0001-90");
console.log("empresa plano pro:", upErr ? upErr.message : "OK");
