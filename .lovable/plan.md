## Plan: TuEntrega - Operations Form, Public/Private Offers, Dispatcher Role

This is a large multi-part change touching the database schema, three major flows, and a brand-new role with its own dashboard. I'll break it into 3 phases so you can review and approve the DB migration before code work begins.

---

### Phase 1 — Database migration (single migration call)

**New `app_role` enum value:** `dispatcher`

**Update `ofertas` table:**
- `tipo` text — `'public'` | `'private'` (default `'public'`)
- `dispatcher_id` uuid (nullable)

**New tables (all with GRANTs + RLS):**

```text
dispatchers
  id, entregador_id, empresa_id, valor_por_pacote (numeric),
  plataformas (text[]), status (text, default 'ativo'), created_at
  UNIQUE (entregador_id, empresa_id)

dispatcher_alocacoes
  id, operacao_id, dispatcher_id,
  pacotes_alocados (int), paradas_alocadas (int), created_at

ofertas_privadas_config
  id, oferta_id, entregador_id, valor_por_pacote (numeric),
  status (text: invited/accepted/refused),
  notificado_em, aceito_em, created_at
```

**RLS summary (plain language):**
- Companies manage their own dispatchers / alocações / private-offer configs.
- A dispatcher (entregador with that role) reads only rows where `entregador_id = auth.uid()` (their own dispatcher record, their own alocações, their own team's private offers).
- An invited entregador sees only their own row in `ofertas_privadas_config` and the corresponding `ofertas` row.
- Update `ofertas` SELECT policy for entregadores: only see public offers OR private offers where they are invited.

---

### Phase 2 — Frontend: Operation form + Public/Private offers

**`/pacotes` Step 1 simplification:**
- Remove: physical count, ML pays/pkg, you pay/pkg, margin box.
- Keep: date, ML system packages, total stops, observations, "Iniciar auditoria →".
- Physical count stays in Step 2 (audit). Financial values read from `empresas.tms_valor_padrao_pacote` / `operacoes.valor_ml_por_pacote` defaults (already exist).

**Offer creation form (`/ofertas`):**
- Top: two large selectable cards — 🌍 Pública / 🔒 Privada (orange border when selected).
- If Private:
  - Search entregadores by name (RLS already lets empresa see related entregadores; we'll broaden search via a server fn using `supabaseAdmin` scoped to active entregadores).
  - Invite list — each invited entregador has their own `valor_por_pacote` input + remove button.
  - Summary line.
- On submit:
  - Insert `ofertas` row with `tipo='private'`, no broadcast.
  - Insert one `ofertas_privadas_config` row per invited entregador with their specific value.
  - Trigger WhatsApp notification (via existing pattern — same as new-offer template in `admin_settings`).

---

### Phase 3 — Dispatcher role + dashboard

**`/entregadores` (empresa view):**
- Each card gets a "Tornar Dispatcher" button.
- Modal: `valor_por_pacote` + platform checkboxes (ML Flex / iFood / Shopee / Lalamove / Todas).
- On confirm:
  1. Insert into `user_roles` (role `dispatcher`) for that entregador.
  2. Insert into `dispatchers` table.

**Operation flow — new step after audit, before publishing:**
- "Alocar entre dispatchers" step.
- List active dispatchers with `pacotes` + `paradas` inputs.
- Validation: sum must equal operation totals, "Faltam X pacotes" indicator, cannot proceed if unallocated.
- Writes to `dispatcher_alocacoes`.

**New dispatcher dashboard (`/dashboard` route, branch by role):**
- Top cards: Pacotes alocados hoje · Meus entregadores ativos · Entregas concluídas hoje · Meus ganhos hoje.
- Sections:
  1. **Meus Pacotes** — rows from `dispatcher_alocacoes` for today.
  2. **Meu Time** — entregadores the dispatcher has previously assigned, with today's status.
  3. **Minha Agenda** — calendar of allocations; can create private offers for team.
  4. **Meus Ganhos** — own deliveries + commission from team (delta between empresa→dispatcher value and dispatcher→team value).

**Dispatcher → team allocation:**
- After receiving allocation, dispatcher sees distribute UI (per-team-member packages/stops/value, including themselves at full value).
- "Publicar rotas do meu time" creates one private `ofertas` row per team member with their specific value (reuses Phase 2 private-offer logic, with `dispatcher_id` set).

**Bottom nav + routing:**
- Add `dispatcher` branch in `BottomNav.tsx`, `TopAppBar.tsx` greeting, and `_authenticated.tsx` role gating.

---

### Technical notes

- **Role detection**: extend `use-auth.ts` so `role` can resolve to `dispatcher` (highest-precedence role for dashboard routing: admin > dispatcher > empresa > entregador). Dispatcher is an *additional* role on top of entregador; the user keeps both.
- **WhatsApp notifications**: reuse the existing `admin_settings.whatsapp_template_new_offer` pattern — no new infra; add a `whatsapp_template_private_invite` column with a default template.
- **No new edge functions** — all server logic stays in TanStack `createServerFn` per project rules.
- **No mock data** — every screen reads from Supabase with skeleton loaders (existing `PageSkeleton` pattern).

---

### Order of execution

1. Submit DB migration → wait for your approval.
2. Implement Phase 2 (operation form simplification + public/private offers).
3. Implement Phase 3 (dispatcher promotion, allocation step, dispatcher dashboard, team distribution).
4. Smoke-test via build, fix any TS errors, deliver.

Approve to proceed and I'll start with the migration.
