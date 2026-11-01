# Ambientes: ao vivo (produção) e teste (staging)

| | **Ao vivo (produção)** | **Teste (staging)** |
|---|---|---|
| Para quê | Clientes reais, dinheiro real | Testar mudanças antes de ir ao ar |
| Branch no GitHub | `main` | `staging` |
| Worker no Cloudflare | `tuentrega` | `tuentrega-staging` |
| Banco (Neon) | branch principal | branch `staging` (cópia) |
| Endereço | https://tuentrega.com.br | https://tuentrega-staging.megapostsantos.workers.dev |

**Regra de ouro:** nada vai para `main` sem ter passado pelo teste. Se der problema, dá no teste, não no ao vivo.

O app reconhece sozinho um endereço de teste (nome com `staging`) e mostra uma **faixa vermelha** no topo: "Ambiente de teste · dados fictícios".

## 1. Banco de teste (Neon)
1. https://console.neon.tech → projeto Tuentrega → **Branches** → **Create branch**.
2. Nome `staging`, a partir da branch principal (copia os dados de hoje; para começar vazio, crie a partir de um ponto antigo ou rode a limpeza depois).
3. Em **Connect**, copie a connection string **dessa branch**. Ela é diferente da de produção.

## 2. Worker de teste (Cloudflare)
1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a repository** (GitHub `megapostsantos/tuentrega`).
2. Nome: `tuentrega-staging`. Branch de produção desse Worker: **`staging`**.
3. Em **Settings → Build**, o comando de deploy deve ser `npx wrangler deploy --name tuentrega-staging` (assim ele não sobrescreve o Worker ao vivo).
4. Em **Settings → Variables and Secrets**, crie (todas como **Secret**, exceto as marcadas):
   - `DATABASE_URL` → string da branch `staging` do Neon
   - `BETTER_AUTH_SECRET` → **outro** valor, diferente do de produção
   - `BETTER_AUTH_URL` (texto) → `https://tuentrega-staging.megapostsantos.workers.dev`
   - `APP_ENV` (texto) → `staging`
   - `RESEND_API_KEY` e `EMAIL_FROM` (opcionais; no teste os e-mails saem com `[TESTE]` no assunto)
   - `ANTHROPIC_API_KEY` (opcional)
5. Primeiro deploy: abra `https://tuentrega-staging…/api/db/setup` logado como admin para criar as tabelas.

## 3. Fluxo de trabalho
1. Toda mudança nova vai primeiro para a branch **`staging`** (o Worker de teste atualiza sozinho).
2. Teste no endereço de teste (fluxo completo: criar operação, atribuir, rodar, baixa, pagamento).
3. Só depois, **junte `staging` em `main`** (Pull Request no GitHub). O Worker ao vivo atualiza.
4. Mudanças de banco (`/api/db/setup`) sempre rodam primeiro no teste.

## 4. Se algo der errado no ao vivo
- **Voltar o código:** Cloudflare → Workers & Pages → `tuentrega` → **Deployments** → escolha a versão anterior → **Rollback**.
- **Voltar o banco:** Neon → **Restore** (a janela de restauração depende do plano; no plano pago são 7 dias).

## 5. Cuidados
- O teste usa **outro banco**: nunca cole a `DATABASE_URL` de produção no Worker de teste.
- Não use dados reais de clientes no teste.
- Domínio próprio para o teste (opcional): `staging.tuentrega.com.br` em **Domains & Routes** do Worker de teste.
