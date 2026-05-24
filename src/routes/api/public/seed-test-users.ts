import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const USERS = [
  {
    email: "lgramirodecampos@gmail.com",
    password: "123456",
    user_metadata: {
      role: "admin",
      full_name: "Luis Gustavo",
    },
  },
  {
    email: "empresa@tuentrega.com",
    password: "123456",
    user_metadata: {
      role: "empresa",
      full_name: "João Silva",
      company_name: "Logística Santos",
      razao_social: "Logística Santos",
      nome_fantasia: "Logística Santos",
      cnpj: "12.345.678/0001-90",
      responsavel: "João Silva",
      whatsapp: "(13) 99999-1111",
    },
  },
  {
    email: "entregador@tuentrega.com",
    password: "123456",
    user_metadata: {
      role: "entregador",
      full_name: "Carlos Souza",
      cpf: "123.456.789-09",
      whatsapp: "(13) 99999-2222",
      tipo_veiculo: "moto",
      placa: "ABC-1234",
      pix_tipo: "telefone",
      pix_chave: "(13) 99999-2222",
      banco: "Nubank",
      turnos: ["manha", "tarde"],
      plataformas: [],
      bairros: [],
    },
  },
];

export const Route = createFileRoute("/api/public/seed-test-users")({
  server: {
    handlers: {
      POST: async () => {
        const results: any[] = [];
        for (const u of USERS) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: u.user_metadata,
          });
          if (error) {
            results.push({ email: u.email, status: "skipped", error: error.message });
            continue;
          }
          results.push({ email: u.email, status: "created", id: data.user?.id });
        }

        // Ensure empresa plano = pro
        await supabaseAdmin
          .from("empresas")
          .update({ plano: "pro" })
          .eq("cnpj", "12.345.678/0001-90");

        return Response.json({ ok: true, results });
      },
    },
  },
});
