## Plano: Criar 3 usuários de teste + desativar HIBP

### 1. Desativar checagem de senha fraca (HIBP)
Chamar `configure_auth` com `password_hibp_enabled: false` para permitir a senha `123456`.

### 2. Criar os 3 usuários via Auth Admin API
Não dá pra criar usuários do `auth.users` por SQL puro de forma segura. Vou usar uma função server-side temporária (`createServerFn`) que chama `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata })` — o trigger `handle_new_user` já popula `profiles`, `user_roles`, `empresas` e `entregadores` a partir do `raw_user_meta_data`.

**Usuários:**

| Email | Senha | Role | Metadata principal |
|---|---|---|---|
| lgramirodecampos@gmail.com | 123456 | admin | full_name: "Luis Gustavo" |
| empresa@tuentrega.com | 123456 | empresa | razao_social: "Logística Santos", cnpj, responsavel: "João Silva", whatsapp |
| entregador@tuentrega.com | 123456 | entregador | full_name: "Carlos Souza", cpf, whatsapp, tipo_veiculo: "moto", placa, pix_tipo: "telefone", pix_chave, banco: "Nubank", turnos: ["manha","tarde"] |

Detalhes:
- Admin: o trigger insere role `entregador` por padrão se `role` não estiver no metadata. Vou passar `role: "admin"` no metadata para o trigger criar `user_roles` corretamente (e como admin não cria linha em `empresas`/`entregadores`, ok).
- Empresa: passar `role: "empresa"` + campos da empresa → trigger insere em `empresas`.
- Entregador: passar `role: "entregador"` + campos → trigger insere em `entregadores`.
- Empresa "Logística Santos" plano `pro`: o trigger cria com `plano='free'` default, então faço UPDATE em `empresas` depois.

### 3. Executar
Rodar a server fn uma vez (idempotente: se email já existe, ignora o erro `email_exists`).

### 4. Saída no chat
Exibir a mensagem de confirmação solicitada.

### Arquivos
- `src/lib/seed-users.functions.ts` (novo) — server fn com `supabaseAdmin`
- chamar via `stack_modern--invoke-server-function` ou um endpoint temporário `/api/public/seed-users` protegido por token simples (mais simples: usar route pública POST one-shot e depois deletar)

Prefiro: criar `src/routes/api/public/seed-test-users.ts` que executa o seed e responde JSON. Eu mesmo invoco via `stack_modern--invoke-server-function` e depois removo o arquivo.

### Aviso de segurança
Desativar HIBP + permitir `123456` deixa o app vulnerável. Recomendo reativar antes de produção.
