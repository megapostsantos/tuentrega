# TuEntrega — Decisões de produto (conversa de 16/10/2026)

Documento vivo. **Decidido** = dito pelo dono do produto. **Proposta** = sugestão a validar.

## Princípios
- O entregador é **da plataforma TuEntrega**, não da empresa. A empresa nunca controla login/senha dele.
- Empresas que trazem motoristas são **parceiras**: o motorista convidado fica **atrelado** a quem convidou.
- A plataforma agrega valor à empresa com gestão (financeiro, contas a pagar, ciclos de pagamento).

## Decidido
1. **Senha:** só o admin redefine. A empresa não pode (evita travar o acesso do motorista).
2. **Vínculo por convite:** quem convida fica atrelado a quem convidou.
3. **Liberação (revisada em 16/10):** enquanto a empresa tem ofertas e o motorista pode escolher aceitar ou não, o vínculo continua. Se a empresa ficar **7 a 14 dias sem publicar nenhuma oferta**, o motorista fica livre para ver ofertas de outras empresas (prazo exato a definir; a regra anterior de "15 dias sem o motorista fazer rota" fica como proposta complementar).
3b. **Remoção pela empresa:** a empresa pode tirar um motorista do seu quadro (ex.: após um incidente). Ele **não é banido da plataforma**, só deixa de carregar para aquela empresa e fica livre para as demais.
4. **Desvinculação paga:** o entregador pode pagar uma mensalidade para se desvincular e ver ofertas de todas as empresas.
   (Já existe no admin o campo de mensalidade do entregador, padrão R$ 15,00, e `trial_days`.)
5. **Blindagem anti-espionagem:** um dono de empresa não pode se cadastrar como motorista para ver o que concorrentes pagam.
6. **Gestão para a empresa:** financeiro, contas a pagar, definição do ciclo de pagamento (semanal, mensal etc.).
7. **Antecipação:** o motorista pode pedir antecipação de um valor a receber, com desconto; a empresa decide se paga.

8. **Parceria após trabalhar junto (16/10):** o motorista entra pelo app por conta própria e aceita ofertas públicas de uma empresa uma ou duas vezes. Se a empresa gostar, pode **propor o vínculo**. Se ele aceitar, a empresa passa a poder **alocar rotas direto** para ele (sem oferta pública) e a plataforma dá benefícios para ele querer ficar atrelado.

9. **Recusa de rota atribuída (17/10):** o entregador pode recusar sem penalidade **até as 18h do dia anterior** à rota; depois disso perde pontos (valor atual: -15, ajustável em `PENALIDADE_RECUSA_TARDIA`). Quem não responde em **2 horas** perde a atribuição (a rota volta ao mercado, sem penalidade). A empresa pode reofertar quando o entregador não aparece.
10. **Rastro e painel (17/10):** o mapa ao vivo desenha o trajeto percorrido; a empresa tem um painel geral com início, tempo em rota, ritmo, previsão de término e estado (em movimento, parado, sem sinal).
12. **Antecipação de pagamento (17/10, fase 1):** o ciclo de pagamento é configurável por empresa (padrão quinzenal). O entregador pede adiantamento do que tem a receber; a empresa define o desconto (ex.: 10%), o limite antecipável e o valor mínimo, aprova ou recusa, faz o PIX fora do app e marca como pago; o valor antecipado é abatido do pagamento do ciclo. A plataforma só **registra** (não movimenta dinheiro). O percentual é configurado só pela empresa; o entregador vê o desconto em reais e o valor líquido.
11. **Campanhas de incentivo (próxima fase):** prêmios e percentuais extras para quem termina rápido. Ver "Campanhas de incentivo" abaixo.

## Campanhas de incentivo (proposta, ainda não construída)
- **Quem cria:** a empresa (para os seus entregadores) e/ou a plataforma (campanhas gerais). Definir quem paga o bônus.
- **Regras possíveis:** terminar a rota antes de um horário (ex.: até 14h); bater uma meta de pacotes/hora; zero problemas; sequência de dias com rotas concluídas.
- **Prêmio:** percentual sobre o valor da rota (ex.: +5%) ou valor fixo; calculado no fechamento da rota e somado ao pagamento.
- **Dados necessários (já coletados):** início da rota (`iniciada_em`), fim (`closed_at`), entregues/problemas e trajeto.
- **Perguntas:** o bônus vale só para rota atribuída ou também ofertas do mercado? Tem teto por entregador? Como evitar que a pressa vire entrega ruim (exigir taxa mínima de sucesso)?

## Proposta (a validar)
**Dois tipos de vínculo**
- **De origem:** a empresa trouxe o motorista (convite por link). Vale a regra de liberação por inatividade da empresa.
- **De parceria:** o motorista chegou sozinho e aceitou a proposta depois de trabalhar com a empresa. Sugestão: **sem exclusividade** (ele continua vendo as demais ofertas), com benefícios, e ele pode sair quando quiser.
- Em ambos, a empresa pode alocar rotas direto; o motorista **recebe como convite e pode aceitar ou recusar** (prazo de resposta a definir, ex.: 4 horas).
- A empresa só pode propor parceria após **N rotas concluídas** com o motorista (padrão: 2), para evitar propostas em massa.
- Remoção pela empresa e liberação pelo admin valem para os dois tipos.
- Benefícios possíveis (escolher): alocação direta sem concorrência; prioridade de horas nas novas ofertas; rotas fixas recorrentes; selo "Parceiro de [empresa]"; taxa menor na antecipação; prioridade no pagamento.

**Blindagem**
- Segurança por perfil no banco **antes de tudo** (hoje qualquer usuário logado lê tudo, inclusive ofertas de concorrentes).
- 1 CPF = 1 conta; 1 CNPJ = 1 conta; cruzar CPF do responsável da empresa com CPF de motorista (bloquear coincidência); telefone e e-mail únicos.
- Aprovação manual do motorista pelo admin antes de ver ofertas (status pendente/aprovado/suspenso).
- Ocultar nome da empresa e endereço exato de coleta até o aceite; o link público da oferta passa a exigir login.
- Termos de uso proibindo uso indevido; registro de acessos; admin pode suspender.
- Origem do cadastro (`convidado_por`) imutável e auditável, para evitar contas falsas de entregador.

**Vínculo**
- Convite por link de uso único (a empresa nunca vê senha); o motorista cria a própria senha e aceita o vínculo.
- Contagem dos 15 dias começa no aceite e zera a cada rota concluída para a empresa; calculado na leitura (sem tarefa agendada).
- Um vínculo ativo por motorista; admin pode liberar/transferir.
- Exclusividade: enquanto vinculado, o motorista vê as ofertas da empresa e escolhe aceitar ou não (**decidido**: o vínculo se mantém enquanto a empresa publicar ofertas).
- Estados do vínculo: `ativo`, `liberado` (por inatividade da empresa, por mensalidade paga ou pelo admin) e `removido` (pela empresa; a empresa fica bloqueada para aquele motorista, com motivo interno e registro).
- Prazo de liberação configurável no admin (padrão sugerido: 14 dias), calculado pela data da última oferta publicada pela empresa.

**Financeiro da empresa**
- Ciclo de pagamento configurável por empresa; fechamento por ciclo; contas a pagar com vencimento.
- Pagamento marcado gera lançamento no financeiro automaticamente (hoje são telas separadas).

**Antecipação**
- Fase 1: marketplace simples. O motorista propõe um desconto, a empresa aceita ou recusa, o pagamento acontece fora do app e a plataforma registra.
- Fase 2 (financiar com dinheiro da plataforma, custódia ou split): é atividade regulada. Validar com advogado/contador e usar um provedor de pagamentos licenciado (Asaas, Mercado Pago, Pagar.me) antes de tocar em dinheiro.

## Ordem sugerida
0. Segurança por perfil.
1. Cadastro com aprovação e blindagem (CPF/CNPJ únicos, ocultação de identidade).
2. Convite por link + vínculo de 15 dias.
3. Botão do admin para redefinir senha.
4. Assinatura do motorista para desvincular (precisa de provedor de pagamentos).
5. Gestão financeira da empresa (ciclos, contas a pagar, integração com pagamentos).
6. Antecipação, fase 1.
7. "Esqueci minha senha" por e-mail (precisa de domínio e serviço de e-mail).

## Perguntas em aberto
- Parceria sem exclusividade? Quais benefícios entram primeiro?
- Prazo de liberação: 7 ou 14 dias sem a empresa publicar oferta?
- Se a empresa publica ofertas mas o motorista não aceita nenhuma por N dias, ele também é liberado?
- A empresa que removeu um motorista pode reconvidá-lo depois? Precisa de motivo obrigatório?
- A mensalidade desvincula de todas as empresas ou só do vínculo atual? Valor final?
- O ciclo de pagamento é definido pela empresa ou pela plataforma?
- Motorista novo precisa de aprovação manual do admin?
- Antecipação: quem fica com o desconto e há taxa para a plataforma?
