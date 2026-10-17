# TuEntrega — Cronograma e estado (atualizado em 17/10/2026)

Legenda: ✅ feito · 🔶 depende de você · ⏳ próxima fase

## Fase 0 — Confirmar que tudo funciona
- ✅ Login, sessão, painéis por perfil, cadastro de empresa e de entregador.

## Fase 1 — Segurança
- ✅ Endpoints de apoio removidos; arquivos com senha escrita no código apagados.
- ✅ Autorização por perfil no servidor (empresa só vê o que é dela; entregador só o dele; dados sensíveis mascarados).
- ✅ Cadastro não permite virar admin; cálculo de penalidade, recusa e antecipação feitos no servidor.
- ✅ Arquivos com dono; documentos exigem login; limite de tentativas de login; cabeçalhos de segurança.
- 🔶 Trocar a senha do banco (Neon) e do admin; definir `BETTER_AUTH_SECRET` forte no Cloudflare.

## Fase 2 — Estabilidade
- ✅ Testes automáticos no projeto (`npm test`): segurança, agenda, recusa, antecipação, ciclo completo (cadastro → operação → rota → baixa → fechamento → antecipação → pagamento), e-mail, setup idempotente e todas as consultas reais do app.
- ✅ Zero erros de tipo; legado do Supabase/Lovable removido.
- ✅ Colunas obrigatórias do banco antigo sincronizadas com o código (setup).
- 🔶 Desconectar o projeto Netlify; ligar backup no Neon e manter o banco acordado em produção.

## Fase 3 — Produto pronto para usar
- ✅ Agenda com compromisso e ajuste; rotas pela agenda; recusa com penalidade e prazo de 2 h; reoferta.
- ✅ Baixa em massa, rastro e painel geral de entregadores; antecipação de pagamento.
- ✅ Redefinição de senha pelo admin (senha provisória + troca obrigatória no primeiro acesso).
- ✅ "Esqueci minha senha" por e-mail (código pronto; **só envia quando houver `RESEND_API_KEY`**).
- 🔶 Contratar o envio de e-mail (Resend) com o domínio próprio; definir `RESEND_API_KEY` e `EMAIL_FROM`.
- ⏳ Convite por link + vínculo de 15 dias; campanhas de incentivo; WhatsApp real; endereços dos pacotes;
  armazenamento de arquivos em R2; tarefa agendada para expirar atribuições.

## Fase 4 — Lançamento na Play Store
- ✅ PWA instalável, política de privacidade, exclusão de conta, roteiro em `docs/PLAY-STORE.md`.
- 🔶 Domínio próprio, conta Google Play, pacote Android (PWABuilder), `assetlinks.json`, teste fechado.
