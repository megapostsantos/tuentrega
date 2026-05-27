# TuEntrega Dispatcher Features — Full Build Plan

Scope is large (7 feature blocks). I'll ship in 4 phases, each independently testable. **No mock data** — every screen reads from Supabase with realtime subscriptions and skeleton loaders.

---

## Phase 1 — Database Foundation (single migration)

**New tables:**
- `dispatcher_team` — dispatcher ↔ entregador relationship + per-member default rate + two-sided exclusivity flags (`exclusivo`, `exclusivo_aceito_dispatcher`, `exclusivo_aceito_entregador`)
- `dispatcher_schedule` — date + estimated packages + status
- `dispatcher_schedule_members` — multi-member assignments with per-member rate + confirmation state

**Updates:**
- `dispatcher_alocacoes`: add `status` (pending/distributed), `distributed_at`, `valor_por_pacote`
- (Optional) confiabilidade tracking note — score table already covers dispatchers

**RLS:** Dispatchers see only their team/allocations/schedule; entregadores see only their own rows; empresa sees their own dispatcher records; admin full access. GRANTs to `authenticated` + `service_role` for every new public table.

**Realtime:** Enable on the 3 new tables + `dispatcher_alocacoes`.

---

## Phase 2 — Dispatcher Shell + Dashboard

- **`use-auth.ts`**: precedence becomes `admin > dispatcher > empresa > entregador`
- **`BottomNav.tsx`**: dispatcher tabs → Home / Pacotes / Time / Agenda / Perfil
- **`TopAppBar.tsx`**: greeting + "Dispatcher" badge
- **`_authenticated.tsx`**: route gating includes dispatcher branch
- **`dashboard.tsx`**: new `DispatcherDashboard` block with 2×2 stats, active-allocation card (urgent if undistributed), team status list, optional own-route card

All queries against `dispatcher_alocacoes`, `dispatcher_team`, `ofertas`, `entregas`. Realtime subscription per channel.

---

## Phase 3 — Allocation, Team, Schedule, Earnings Pages

- **`/pacotes` (dispatcher view)**: distribution UI — list team members with packages/stops/value inputs, running totals, financial preview (own earnings + margin commissions), "Publicar rotas do time" → creates private `ofertas` + `ofertas_privadas_config` per member, marks `dispatcher_alocacoes.status='distributed'`, WhatsApp template per invitee
- **`/time` (new route)**: team CRUD, search entregador to add, inline edit `valor_padrao_por_pacote`, exclusivity toggle with two-sided accept flow + notification, team stats header
- **`/agenda` (dispatcher view)**: weekly calendar, "+ Agendar dia" form (date, members, est. packages, rate), team members see pending confirmations
- **`/ganhos` (new route, dispatcher only)**: 4 summary cards, 3 tabs (Minhas entregas / Comissões / Extrato), monthly statement, PDF export via browser print

---

## Phase 4 — Company-Side Allocation Step

- **`/pacotes` (empresa flow)**: insert new step "Alocar entre dispatchers" between audit and publish. Lists active dispatchers with package/stop inputs, validates sum = operation totals, writes to `dispatcher_alocacoes`, sends WhatsApp notifications. "Gerenciar sem dispatchers" skip button preserves current direct-publish flow.

---

## Technical Notes

- All new routes follow `_authenticated/{name}.tsx` convention; routeTree auto-regenerates
- WhatsApp notifications reuse the existing `admin_settings.whatsapp_template_private_invite` pattern
- Skeleton loaders + framer-motion transitions already in place from prior loop
- PDF export uses `window.print()` with a print-only stylesheet (no new dep)
- Exclusivity enforcement: a row is "active exclusive" only when both `exclusivo_aceito_dispatcher` and `exclusivo_aceito_entregador` are true; ofertas RLS will check this for filtering marketplace visibility

---

## Order of execution

1. Migration (Phase 1) — requires approval
2. Auth/nav/dashboard shell (Phase 2)
3. Distribution + Team + Agenda + Ganhos pages (Phase 3)
4. Company allocation step (Phase 4)

I'll start Phase 1 (migration) once you approve this plan.
