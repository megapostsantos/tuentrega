# TuEntrega — Fluxo da operação até a oferta (como o app funciona hoje)

Documento gerado a partir da leitura do código (não é o que "deveria" ser, é o que está implementado).
Marcações: **[OK]** funciona como esperado · **[LACUNA]** faltando ou quebrado · **[NOVO]** corrigido/criado em 16/10/2026.

---

## 1. Atores

| Ator | O que faz no fluxo |
|---|---|
| **Empresa** | Cria a operação, divide em rotas, publica ofertas, aloca entregadores, acompanha e paga. |
| **Entregador** | Vê ofertas, aceita, executa a rota (entrega/problema), fecha a rota, recebe. |
| **Dispatcher** | Entregador "promovido" pela empresa: recebe um lote de pacotes e redistribui ao seu time. |
| **Admin** | Painel `/admin/*`; pode "Visualizar como" empresa ou entregador. |

## 2. Visão geral

```
OPERAÇÃO  ->  ROTAS  ->  OFERTAS  ->  ACEITE / ALOCAÇÃO  ->  EXECUÇÃO  ->  FECHAMENTO  ->  PAGAMENTO
(pacotes,    (divisão    (1 por       (entregador aceita,     (entrega com    (conta, score,   (empresa marca
 paradas,     em N)       rota)        empresa atribui, ou     assinatura e     registro de      pago; PIX é
 valor)                                dispatcher distribui)   foto)            ganhos)          fora do app)
```

## 3. Etapa a etapa

### A. Criar a operação — menu **Pacotes → Iniciar nova operação** (assistente de 4 passos)

**Passo 1 — Dados da operação**
- Origem/cliente: Mercado Livre (padrão), Shopee, Shein, Amazon, Magalu, iFood, Rappi ou "Outro" (digitar).
- Filial (opcional), data da operação (padrão hoje).
- Total de pacotes, total de paradas, valor por pacote (padrão R$ 1,80 ou o valor configurado na empresa).
- Calculados na tela: média de pacotes por parada e total estimado.
- Obrigatórios para avançar: origem, pacotes > 0, paradas > 0, valor > 0.
- Atalho "Escanear pacotes" (QR) cria operações do tipo NEX por outro caminho.

**Passo 2 — Como dividir em rotas**
- **Automática:** N rotas (padrão 3). Divide pacotes e paradas igualmente; a sobra vai de 1 em 1 para as primeiras rotas.
- **Manual:** você define cada rota; a soma de pacotes e de paradas tem de bater exatamente com o total.
- **Rota única:** tudo em uma rota.

**Passo 3 — Revisão**
- Pode editar nome, pacotes e paradas de cada rota.
- Valor por rota personalizado (opcional); receita da empresa e margem (informativo); observações.

**Ao clicar "Criar operação"** o sistema grava:
- `operacoes` com status **draft** (rascunho);
- uma `rotas_operacao` por rota, status **draft**.
- **Nenhuma oferta existe ainda.**

**Passo 4 — "O que deseja fazer agora?"** (os três botões)
1. **Publicar como oferta** — cria as ofertas (etapa B).
2. **Ver operação** — sai do assistente e volta para a lista.
3. **Nova operação** — reinicia o assistente.

> **O que travou na sua simulação:** o estado do assistente (rotas criadas, ids) existia só na tela.
> Ao clicar "Ver operação" (ou "Nova operação") antes de "Publicar", o assistente se perdia e a operação
> ficava em rascunho, sem ofertas. Antes de hoje, a tela de detalhe da operação **não tinha** botão para publicar. **[NOVO: corrigido]**

### B. Publicar as ofertas

Para cada rota, o sistema cria **uma oferta**:
- status **open**; `tipo_entrega = package_delivery`;
- título `"<origem> · <rota> - <data>"`; valor total da rota; valor por pacote; quantidade de pacotes e de paradas;
- vínculos `operacao_id` e `rota_operacao_id`; `data_trabalho` = data da operação.
- Cria N **pacotes placeholder** (`entregas_pacotes`, status `pending`, **sem endereço**).
- A rota passa a **open** com `oferta_id`; a operação passa a **published**.
- Mostra a tela de compartilhamento (link público `/oferta/<id>`, WhatsApp, e-mail).

**[NOVO]** Na tela de detalhe da operação, se houver rotas sem oferta aparece o bloco
*"N rota(s) ainda sem oferta publicada → Publicar N oferta(s)"*. A coluna de status mostra "Não publicada" nessas rotas.

### C. Quem fica com cada rota (três caminhos)

1. **Entregador aceita** (menu Ofertas): vê ofertas `open` e toca "Aceitar". Grava `entregador_id` e passa direto para **in_progress** (não existe etapa "aguardando aprovação da empresa").
2. **Empresa atribui** (detalhe da operação → painel de Alocação):
   - **[NOVO]** em cada rota sem entregador há um seletor "Escolher entregador… → Atribuir" (cria a alocação e marca a oferta como `accepted` com aquele entregador).
   - "Auto-alocar": distribui entre entregadores que aceitaram *previsões da agenda* do dia. **[LACUNA]** nenhuma tela grava `previsao_id`, então hoje esse botão quase nunca encontra ninguém.
   - "Iniciar operação": coloca todas as ofertas em `in_progress` e avisa os destinatários (WhatsApp, ver lacunas).
3. **Via dispatcher:**
   - Empresa torna um entregador "dispatcher" (Entregadores → Tornar Dispatcher), com valor por pacote.
   - Tela de alocação a dispatchers (`/pacotes/alocar/<operação>`): distribui pacotes/paradas entre dispatchers; a soma tem de fechar. **[LACUNA]** essa tela existe, mas **nenhum botão leva até ela**.
   - O dispatcher recebe o aviso, abre `/pacotes/distribuir/<alocação>` e reparte entre ele e o time; cada parte vira uma **oferta privada** (`tipo = private`) com convite em `ofertas_privadas_config`.
   - Comissão do dispatcher = (valor da empresa − valor do membro) × pacotes, só como prévia. **[LACUNA]** não é gravada em lugar nenhum (`dispatcher_commissions` nunca recebe dados), então a tela Ganhos do dispatcher fica vazia.

### D. Execução da rota (entregador — menu Rotas)

- Abre a oferta `in_progress`; se estava `accepted`, passa sozinha para `in_progress` ao abrir.
- Lista os pacotes por `ordem_otimizada` ou número. **[LACUNA]** os pacotes nascem **sem endereço**; não há importação de endereços nesse fluxo, então a rota não tem paradas reais, nem mapa/navegação.
- **Entregue:** assinatura (obrigatória) + foto (obrigatória) + nome de quem recebeu. Status do pacote vira `delivered`.
- **Problema:** 5 motivos; foto opcional; pacote vira `not_delivered`; cria registro em `entregas_ocorrencias`.
- Localização enviada a cada 15 s (`entregador_localizacao`). **[LACUNA]** ninguém lê esses dados nas telas (a empresa não vê o entregador no mapa).

### E. Fechamento

- Botão **Finalizar** só aparece com todos os pacotes concluídos.
- Há **dois caminhos diferentes** (**[LACUNA]**):
  - `CloseRouteDialog` (4 passos): o entregador digita quantos entregou/não entregou, escolhe motivo por ocorrência (perda de score: −20, −30, −10, 0), foto/ID do pacote, e confirma. Aplica pontos de **confiabilidade** (+10 se 100%, +5 se ≥95%), cria o lançamento em `entregas` (valor = entregues × valor por pacote) e avisa o admin.
  - `finalizarRota` (em Rotas): só marca a oferta como `completed` — sem score, sem `entregas`, sem aviso.

### F. Pagamento

- Pagamentos (empresa): lista por entregador as ofertas `completed` com `payment_status = pending`; "Marcar pago" grava `paid`, data, observação e quem confirmou, cria registro em `pagamentos` (com NF) e atualiza `entregas`.
- O **PIX é feito fora do app**: o app só mostra a chave para copiar; a empresa confirma manualmente.
- Nota fiscal: obrigatória para entregador PJ; regra de R$ 500 é só aviso visual.
- Financeiro (empresa): livro-caixa manual separado (`financeiro_lancamentos`); **não** é alimentado pelos pagamentos.

---

## 4. Estados que existem hoje

| Entidade | Valores |
|---|---|
| `operacoes.status` | `draft`, `published` (e a etiqueta "Divergência" quando há pacotes faltando/a mais) |
| `rotas_operacao.status` | `draft`, `open` |
| `ofertas.status` | `open`, `accepted`, `in_progress`, `completed`, `cancelled` (não existe `expired`) |
| `ofertas.payment_status` | `pending`, `paid` |
| `alocacoes.status` | `allocated`, `started` |
| `dispatcher_alocacoes.status` | `pending`, `distributed` |
| `ofertas_privadas_config.status` | `invited`, `accepted` |
| `entregas_pacotes.status` | `pending`, `delivered`, `not_delivered` (entregador) e também `pendente`, `entregue`, `devolvido`, `problema`, `cancelado`, `pago` (outras telas) |

## 5. Lacunas, em ordem de gravidade

**Críticas (segurança / quebrado)**
1. **Rastreio público quebrado:** `getTrackingByToken` retorna sempre vazio e o token do pacote nunca é gerado; todo link `/rastrear/...` mostra "não encontrado".
2. `updatePacoteStatus` é público **sem autenticação**: qualquer pessoa com o ID de um pacote altera o status.
3. O link público da oferta mostra ofertas **privadas, canceladas e concluídas**, e expõe o endereço de coleta.
4. Segurança por perfil no banco (empresa vendo dados de outra) — ainda não feita.

**Produto incompleto**
5. **Pacotes sem endereço** (só contagem). Falta definir como os endereços entram (planilha, scan, integração).
6. **WhatsApp não envia nada:** só registra em tabela; o status "enviado" é falso e os toasts "notificado" em Pagamentos são `console.info`.
7. Comissão de dispatcher e extratos mensais não são calculados nem gravados; prazo de 4 h do dispatcher não é aplicado.
8. Auto-alocação depende de "previsões" que nenhuma tela cria; a tela de alocar a dispatchers não tem botão de acesso.
9. NEX (saídas/insucessos) não se liga a operações, ofertas nem pacotes; QR digitado à mão.

**Regras e consistência**
10. Aceite sem proteção de corrida (dois entregadores podem receber "sucesso") e sem checar veículo, score, nível ou suspensão.
11. Entregador não pode cancelar; `permite_cancelamento`/`cancelamento_ate` existem no banco mas nenhuma tela os usa.
12. Valores de pagamento divergem (valor cheio da oferta × proporcional às entregas).
13. "Marcar pago" bloqueado por NF pendente ignora a NF que o entregador já enviou; botão "markPaid" em Ofertas é enganoso.
14. Fechamento com dois caminhos diferentes; contagem manual ignora o status real dos pacotes; escritas não atômicas.
15. Vocabulário de status de pacote misturado (inglês/português): Devoluções não enxerga os insucessos do entregador.
16. Ofertas expiram só quando a empresa abre a página (não há rotina no servidor).
17. `tipo_entrega` inconsistente (`pacotes`/`esporadico` × `package_delivery`).

## 6. Decisões de produto que precisam ser tomadas

1. **Endereços:** como entram os endereços dos pacotes e quem os vê (empresa envia planilha? scan do código? integração com o marketplace?).
2. **Aceite:** o entregador aceita e já está dentro, ou a empresa aprova? Pode haver aceite parcial de uma rota?
3. **Cancelamento:** entregador pode desistir? Até quando? Há penalidade no score?
4. **Pagamento:** quando é devido; valor = oferta cheia ou proporcional ao entregue; NF obrigatória para quem; integrar PIX de verdade?
5. **Mensagens:** qual provedor de WhatsApp (Meta Cloud API, Twilio, Z-API…).
6. **Dispatcher:** como e quando a comissão é calculada e paga; prazo de aceite (4 h) é regra de verdade?
7. **Várias operações no mesmo dia** e relação com "previsões/agenda".

## 7. Sugestão de fluxo-alvo (para discutir)

1. Empresa cria a operação (com ou sem planilha de endereços) → vira rascunho salvo.
2. Divide em rotas → **Publicar** pode ser feito a qualquer momento, na lista ou no detalhe **[feito]**.
3. Oferta pública, privada ou atribuição direta **[feito parcialmente]**.
4. Entregador aceita (regras de elegibilidade) → executa → fecha rota (um único caminho de fechamento).
5. Fechamento gera valor devido proporcional; empresa paga e confirma; recibo e NF anexados; lançamento no financeiro automático.
6. Rastreio público e avisos ao destinatário funcionando.
