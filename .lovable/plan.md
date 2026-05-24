## Objetivo

Permitir que o admin alterne entre os 3 perfis (Admin, Empresa, Entregador) direto pela sidebar, escolhendo qual conta assumir, sem precisar abrir as páginas `/admin/companies` ou `/admin/deliverers` toda vez.

## O que será feito

### 1. Novo componente `RoleSwitcher` na sidebar
- Bloco fixo no topo da sidebar (tanto a `AdminSidebar` quanto a `AppSidebar` do `_authenticated`), visível apenas para usuários cujo `realRole === "admin"`.
- 3 botões/abas: **Admin** • **Empresa** • **Entregador**, com o ativo destacado em laranja.
- Comportamento:
  - **Admin**: limpa qualquer impersonação ativa e leva para `/admin/dashboard`.
  - **Empresa**: abre um popover/sheet com a lista de empresas (busca por nome). Ao clicar em uma, grava a impersonação e navega para `/dashboard` (área `_authenticated`).
  - **Entregador**: igual ao de cima, mas listando entregadores e indo para `/dashboard`.
- Mostra a empresa/entregador atualmente assumido logo abaixo dos botões, com um "x" para sair da visualização.

### 2. Memória da última conta usada
- Guardar em `localStorage` (`tu_last_empresa_id`, `tu_last_entregador_id`) a última conta assumida em cada perfil.
- Ao clicar em Empresa/Entregador, se houver "última conta" válida, entra direto nela (1 clique). O popover de busca abre só se segurar/clicar num "Trocar conta".

### 3. Sidebar unificada durante impersonação
- Hoje, quando o admin está impersonando, ele vê a `AppSidebar` (do role assumido) e perde o acesso rápido aos menus admin.
- A `AppSidebar` passa a renderizar o `RoleSwitcher` no topo quando `isImpersonating` for true, permitindo voltar para Admin ou pular direto para outro perfil sem ter que clicar em "Sair da visualização" + reabrir admin + reimpersonar.

### 4. Sem mudanças de banco
- Reaproveita a infra existente: tabela `admin_impersonations`, `lib/impersonation.ts`, `hook use-auth` (que já troca `id` e `role` quando impersonando) e as RLS policies de admin (`admin manage ofertas`, `admin manage entregas`, etc.) já cobrem CRUD em nome de outros usuários.
- Nenhuma migração nova.

## Arquivos afetados

- **novo** `src/components/RoleSwitcher.tsx` — UI do seletor + popover de escolha de conta.
- **edit** `src/components/AdminSidebar.tsx` — monta o `RoleSwitcher` no topo.
- **edit** `src/components/AppSidebar.tsx` — monta o `RoleSwitcher` no topo quando o usuário real for admin (impersonando).
- **edit** `src/lib/impersonation.ts` — adicionar helpers `getLastImpersonated(type)` / `setLastImpersonated(...)`.
- **edit** `src/hooks/use-auth.ts` — expor `realRole` (já temos `realUserId` e `isImpersonating`, falta o role real para a sidebar decidir mostrar o switcher).

## Fora do escopo

- Criar conta-teste fixa.
- Mudar RLS ou criar novo tipo de "modo admin sem dados".
- Alterar páginas internas (`/ofertas`, `/rotas` etc.) — elas já funcionam com o `useAuth` retornando o id/role assumido.
