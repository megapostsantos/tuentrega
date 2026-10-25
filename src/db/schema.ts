import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  date,
  time,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---- Enums ----
export const appRoleEnum = pgEnum("app_role", [
  "admin",
  "empresa",
  "entregador",
  "dispatcher",
]);

export const veiculoTipoEnum = pgEnum("veiculo_tipo", [
  "walker",
  "biker",
  "motoboy",
  "carro",
  "caminhao",
  "moto_eletrica",
]);

export const pixTipoEnum = pgEnum("pix_tipo", [
  "cpf",
  "cnpj",
  "email",
  "telefone",
  "aleatoria",
]);

// ---- Better Auth tables (managed by better-auth) ----
// We define these here so Drizzle knows about them for migrations
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  role: text("role").default("entregador"),
  banned: boolean("banned").default(false),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonatedBy"),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ---- App tables ----

export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  phone: text("phone"),
  companyName: text("company_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: appRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_roles_user_role_idx").on(t.userId, t.role)],
);

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  trialDays: integer("trial_days").notNull().default(0),
  features: text("features").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const empresas = pgTable("empresas", {
  id: text("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  razaoSocial: text("razao_social").notNull(),
  cnpj: text("cnpj").unique(),
  nomeFantasia: text("nome_fantasia"),
  segmento: text("segmento"),
  cep: text("cep"),
  rua: text("rua"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  whatsapp: text("whatsapp"),
  responsavel: text("responsavel"),
  plano: text("plano").notNull().default("free"),
  status: text("status").notNull().default("ativo"),
  trialEndsAt: timestamp("trial_ends_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  tmsMetodoPadrao: text("tms_metodo_padrao"),
  tmsMostrarMargem: boolean("tms_mostrar_margem").default(false),
  tmsPacotesPorRota: integer("tms_pacotes_por_rota"),
  tmsValorPadraoPacote: numeric("tms_valor_padrao_pacote"),
});

export const entregadores = pgTable("entregadores", {
  id: text("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  nomeCompleto: text("nome_completo").notNull(),
  cpf: text("cpf").unique(),
  whatsapp: text("whatsapp"),
  tipoVeiculo: veiculoTipoEnum("tipo_veiculo"),
  bairros: text("bairros").array().notNull().default([]),
  pixTipo: pixTipoEnum("pix_tipo"),
  pixChave: text("pix_chave"),
  banco: text("banco"),
  dataNascimento: date("data_nascimento"),
  selfieUrl: text("selfie_url"),
  placa: text("placa"),
  cep: text("cep"),
  rua: text("rua"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  turnos: text("turnos").array().notNull().default([]),
  plataformas: text("plataformas").array().notNull().default([]),
  plataformaComprovanteUrl: text("plataforma_comprovante_url"),
  status: text("status").notNull().default("ativo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  activatedAt: timestamp("activated_at"),
  cnpj: text("cnpj"),
  email: text("email"),
  invitedAt: timestamp("invited_at"),
  modeloVeiculo: text("modelo_veiculo"),
  marcaVeiculo: text("marca_veiculo"),
  reliabilityLevel: text("reliability_level"),
  reliabilityScore: integer("reliability_score"),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  tipoOperacao: text("tipo_operacao"),
  tipoPessoa: text("tipo_pessoa").default("pf"),
});

export const ofertas = pgTable("ofertas", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: text("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  bairro: text("bairro"),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("0"),
  exigeNotaFiscal: boolean("exige_nota_fiscal").notNull().default(false),
  status: text("status").notNull().default("open"),
  tipoEntrega: text("tipo_entrega"),
  veiculoNecessario: text("veiculo_necessario"),
  quantidadePacotes: integer("quantidade_pacotes"),
  valorPorPacote: numeric("valor_por_pacote"),
  enderecoColeta: text("endereco_coleta"),
  prazoPagamento: text("prazo_pagamento"),
  prazoPagamentoData: date("prazo_pagamento_data"),
  dataTrabalho: date("data_trabalho"),
  horaInicio: time("hora_inicio"),
  horaFim: time("hora_fim"),
  expiraEm: timestamp("expira_em"),
  entregadorId: text("entregador_id"),
  atribuidaEm: timestamp("atribuida_em"),
  iniciadaEm: timestamp("iniciada_em"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  cancelamentoAte: timestamp("cancelamento_ate"),
  closedAt: timestamp("closed_at"),
  closingNotes: text("closing_notes"),
  dataAgendada: date("data_agendada"),
  dispatcherId: text("dispatcher_id"),
  filialId: uuid("filial_id"),
  operacaoId: uuid("operacao_id"),
  pacotesEntregues: integer("pacotes_entregues"),
  pacotesNaoEntregues: integer("pacotes_nao_entregues"),
  paymentConfirmedBy: text("payment_confirmed_by"),
  paymentDate: timestamp("payment_date"),
  paymentNotes: text("payment_notes"),
  paymentStatus: text("payment_status").default("pending"),
  permiteCancelamento: boolean("permite_cancelamento").default(false),
  previsaoId: uuid("previsao_id"),
  quantidadeParadas: integer("quantidade_paradas"),
  rotaOperacaoId: uuid("rota_operacao_id"),
  tipo: text("tipo").default("normal"),
  tipoServico: text("tipo_servico").default("last_mile"),
});

export const entregas = pgTable(
  "entregas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ofertaId: uuid("oferta_id").references(() => ofertas.id, {
      onDelete: "set null",
    }),
    empresaId: text("empresa_id")
      .notNull()
      .references(() => empresas.id, { onDelete: "cascade" }),
    entregadorId: text("entregador_id")
      .notNull()
      .references(() => entregadores.id, { onDelete: "cascade" }),
    valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("0"),
    exigeNotaFiscal: boolean("exige_nota_fiscal").notNull().default(false),
    notaFiscalUrl: text("nota_fiscal_url"),
    status: text("status").notNull().default("pendente"),
    dataEntrega: timestamp("data_entrega").notNull().defaultNow(),
    dataPagamento: timestamp("data_pagamento"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_entregas_empresa").on(t.empresaId, t.dataEntrega),
    index("idx_entregas_entregador").on(t.entregadorId, t.dataEntrega),
    uniqueIndex("entregas_oferta_id_unique").on(t.ofertaId),
  ],
);

export const entregasPacotes = pgTable("entregas_pacotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ofertaId: uuid("oferta_id").notNull(),
  numeroPacote: integer("numero_pacote").notNull(),
  enderecoEntrega: text("endereco_entrega"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  assinaturaUrl: text("assinatura_url"),
  codigoPacote: text("codigo_pacote"),
  dataAgendada: date("data_agendada"),
  destinatarioEmail: text("destinatario_email"),
  destinatarioNome: text("destinatario_nome"),
  destinatarioTelefone: text("destinatario_telefone"),
  distanciaAnteriorMetros: numeric("distancia_anterior_metros"),
  entregueEm: timestamp("entregue_em"),
  fotoPodUrl: text("foto_pod_url"),
  instrucoesEspeciais: text("instrucoes_especiais"),
  janelaFim: text("janela_fim"),
  janelaInicio: text("janela_inicio"),
  lat: numeric("lat"),
  lng: numeric("lng"),
  motivoNaoEntrega: text("motivo_nao_entrega"),
  nomeRecebedor: text("nome_recebedor"),
  nxCode: text("nx_code"),
  observacaoEntrega: text("observacao_entrega"),
  operacaoId: uuid("operacao_id"),
  ordemOtimizada: integer("ordem_otimizada"),
  tempoEstimadoMinutos: integer("tempo_estimado_minutos"),
  tentativas: integer("tentativas").default(0),
  tokenRastreamento: text("token_rastreamento"),
});

export const operacoes = pgTable(
  "operacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: text("empresa_id").notNull(),
    dataOperacao: date("data_operacao").notNull(),
    totalPacotesSistema: integer("total_pacotes_sistema").notNull().default(0),
    totalPacotesContados: integer("total_pacotes_contados").notNull().default(0),
    totalParadas: integer("total_paradas").notNull().default(0),
    pacotesFaltando: integer("pacotes_faltando").notNull().default(0),
    pacotesAMais: integer("pacotes_a_mais").notNull().default(0),
    valorPorPacote: numeric("valor_por_pacote").notNull().default("0"),
    valorMlPorPacote: numeric("valor_ml_por_pacote").notNull().default("2.60"),
    metodoDivisao: text("metodo_divisao").notNull().default("packages"),
    status: text("status").notNull().default("draft"),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    filialId: uuid("filial_id"),
    nxCode: text("nx_code"),
    origem: text("origem"),
    sacaQrCode: text("saca_qr_code"),
    tipoServico: text("tipo_servico").default("last_mile"),
    totalPacotes: integer("total_pacotes"),
  },
  (t) => [index("idx_operacoes_empresa").on(t.empresaId, t.dataOperacao)],
);

export const rotasOperacao = pgTable(
  "rotas_operacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operacaoId: uuid("operacao_id")
      .notNull()
      .references(() => operacoes.id, { onDelete: "cascade" }),
    empresaId: text("empresa_id").notNull(),
    nome: text("nome").notNull(),
    quantidadePacotes: integer("quantidade_pacotes").notNull().default(0),
    quantidadeParadas: integer("quantidade_paradas").notNull().default(0),
    valorTotal: numeric("valor_total").notNull().default("0"),
    ofertaId: uuid("oferta_id"),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_rotas_operacao_op").on(t.operacaoId)],
);

export const alocacoes = pgTable("alocacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  operacaoId: uuid("operacao_id").notNull(),
  rotaId: uuid("rota_id").notNull(),
  entregadorId: text("entregador_id").notNull(),
  ofertaId: uuid("oferta_id"),
  empresaId: text("empresa_id").notNull(),
  alocadoEm: timestamp("alocado_em").notNull().defaultNow(),
  status: text("status").notNull().default("allocated"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const confiabilidadeScore = pgTable("confiabilidade_score", {
  entregadorId: text("entregador_id").primaryKey(),
  score: integer("score").notNull().default(100),
  nivel: text("nivel").notNull().default("gold"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const confiabilidadeHistorico = pgTable("confiabilidade_historico", {
  id: uuid("id").primaryKey().defaultRandom(),
  entregadorId: text("entregador_id").notNull(),
  operacaoId: uuid("operacao_id"),
  tipo: text("tipo"),
  delta: integer("delta").notNull().default(0),
  motivo: text("motivo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  evento: text("evento"),
  pontos: integer("pontos"),
  descricao: text("descricao"),
});

export const entregasOcorrencias = pgTable("entregas_ocorrencias", {
  id: uuid("id").primaryKey().defaultRandom(),
  ofertaId: uuid("oferta_id"),
  entregadorId: text("entregador_id").notNull(),
  empresaId: text("empresa_id").notNull(),
  tipo: text("tipo"),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  fotosUrls: text("fotos_urls").array().default([]),
  motivo: text("motivo"),
  numeroPacote: integer("numero_pacote"),
  packageId: text("package_id"),
  packageIdScanMethod: text("package_id_scan_method"),
  scoreImpact: integer("score_impact").default(0),
  subMotivo: text("sub_motivo"),
});

export const pagamentos = pgTable(
  "pagamentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: text("empresa_id").notNull(),
    entregadorId: text("entregador_id").notNull(),
    ofertasIds: uuid("ofertas_ids").array().notNull().default([]),
    valorTotal: numeric("valor_total").notNull().default("0"),
    dataPagamento: timestamp("data_pagamento").notNull().defaultNow(),
    observacao: text("observacao"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    nfNumero: text("nf_numero"),
    nfUrl: text("nf_url"),
  },
  (t) => [
    index("idx_pagamentos_empresa").on(t.empresaId, t.dataPagamento),
    index("idx_pagamentos_entregador").on(t.entregadorId, t.dataPagamento),
  ],
);

export const extratosMensais = pgTable("extratos_mensais", {
  id: uuid("id").primaryKey().defaultRandom(),
  entregadorId: text("entregador_id").notNull(),
  mesReferencia: text("mes_referencia").notNull(),
  totalEntregas: integer("total_entregas").notNull().default(0),
  totalPacotes: integer("total_pacotes").notNull().default(0),
  totalBruto: numeric("total_bruto").notNull().default("0"),
  totalRecebido: numeric("total_recebido").notNull().default("0"),
  totalPendente: numeric("total_pendente").notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dispatchers = pgTable(
  "dispatchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entregadorId: text("entregador_id").notNull(),
    empresaId: text("empresa_id").notNull(),
    valorPorPacote: numeric("valor_por_pacote").notNull().default("0"),
    plataformas: text("plataformas").array().notNull().default([]),
    status: text("status").notNull().default("ativo"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("dispatchers_entregador_empresa_unique").on(t.entregadorId, t.empresaId)],
);

export const dispatcherAlocacoes = pgTable("dispatcher_alocacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  operacaoId: uuid("operacao_id").notNull(),
  dispatcherId: uuid("dispatcher_id").notNull(),
  empresaId: text("empresa_id").notNull(),
  pacotesAlocados: integer("pacotes_alocados").notNull().default(0),
  paradasAlocadas: integer("paradas_alocadas").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  notes: text("notes"),
  status: text("status").default("pending"),
  valorPorPacote: numeric("valor_por_pacote").default("0"),
  distributedAt: timestamp("distributed_at"),
});

export const entregadoresGerenciados = pgTable("entregadores_gerenciados", {
  entregadorId: text("entregador_id").primaryKey(),
  empresaId: text("empresa_id").notNull(),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export const entregadorDocumentos = pgTable("entregador_documentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  entregadorId: text("entregador_id").notNull(),
  empresaId: text("empresa_id").notNull(),
  tipo: text("tipo").notNull(),
  path: text("path").notNull(),
  nomeArquivo: text("nome_arquivo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const configPagamento = pgTable("config_pagamento", {
  empresaId: text("empresa_id").primaryKey(),
  ciclo: text("ciclo").notNull().default("quinzenal"),
  antecipacaoAtiva: boolean("antecipacao_ativa").notNull().default(false),
  antecipacaoPercentual: numeric("antecipacao_percentual", { precision: 5, scale: 2 }).notNull().default("10"),
  limitePercentual: integer("limite_percentual").notNull().default(100),
  valorMinimo: numeric("valor_minimo", { precision: 10, scale: 2 }).notNull().default("50"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const antecipacoes = pgTable("antecipacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: text("empresa_id").notNull(),
  entregadorId: text("entregador_id").notNull(),
  valorBruto: numeric("valor_bruto", { precision: 10, scale: 2 }).notNull(),
  percentual: numeric("percentual", { precision: 5, scale: 2 }).notNull(),
  desconto: numeric("desconto", { precision: 10, scale: 2 }).notNull(),
  valorLiquido: numeric("valor_liquido", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("solicitada"),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  decididaEm: timestamp("decidida_em"),
  pagaEm: timestamp("paga_em"),
  abatidaEm: timestamp("abatida_em"),
});

export const ofertasRecusas = pgTable("ofertas_recusas", {
  id: uuid("id").primaryKey().defaultRandom(),
  ofertaId: uuid("oferta_id").notNull(),
  empresaId: text("empresa_id").notNull(),
  entregadorId: text("entregador_id").notNull(),
  origem: text("origem").notNull().default("entregador"),
  motivo: text("motivo"),
  penalizada: boolean("penalizada").notNull().default(false),
  pontos: integer("pontos"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const agendaCompromissos = pgTable(
  "agenda_compromissos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    previsaoId: uuid("previsao_id").notNull(),
    empresaId: text("empresa_id").notNull(),
    entregadorId: text("entregador_id").notNull(),
    pacotesComprometidos: integer("pacotes_comprometidos").notNull().default(0),
    pacotesAjustados: integer("pacotes_ajustados"),
    status: text("status").notNull().default("comprometido"),
    observacao: text("observacao"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("agenda_compromissos_unique").on(t.previsaoId, t.entregadorId)],
);

export const agendaPrevisoes = pgTable("agenda_previsoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: text("empresa_id").notNull(),
  dataPrevista: date("data_prevista").notNull(),
  pacotesEstimados: integer("pacotes_estimados").notNull().default(0),
  rotasEstimadas: integer("rotas_estimadas").notNull().default(0),
  pacotesPorRota: integer("pacotes_por_rota").notNull().default(0),
  valorPorPacote: numeric("valor_por_pacote").notNull().default("0"),
  veiculoNecessario: text("veiculo_necessario"),
  enderecoColeta: text("endereco_coleta"),
  horaAbertura: text("hora_abertura"),
  permitelCancelamento: boolean("permite_cancelamento").notNull().default(false),
  cancelamentoAte: timestamp("cancelamento_ate"),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auditoriaFaixas = pgTable("auditoria_faixas", {
  id: uuid("id").primaryKey().defaultRandom(),
  operacaoId: uuid("operacao_id"),
  empresaId: text("empresa_id").notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  rotaId: uuid("rota_id"),
  faixaInicio: integer("faixa_inicio"),
  faixaFim: integer("faixa_fim"),
  ordem: integer("ordem"),
  pacotesContados: integer("pacotes_contados"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminImpersonations = pgTable("admin_impersonations", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: text("admin_id").notNull(),
  targetUserId: text("target_user_id").notNull(),
  targetType: text("target_type").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const adminLogs = pgTable("admin_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: text("admin_id").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminNotifications = pgTable("admin_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: integer("id").primaryKey().default(1),
  delivererSubscriptionCents: integer("deliverer_subscription_cents")
    .notNull()
    .default(1500),
  trialDays: integer("trial_days").notNull().default(14),
  fiscalNoteDeadlineDay: integer("fiscal_note_deadline_day").notNull().default(10),
  whatsappTemplatePayment: text("whatsapp_template_payment")
    .notNull()
    .default("Olá {nome}, seu pagamento de R$ {valor} foi confirmado via PIX."),
  whatsappTemplateNewOffer: text("whatsapp_template_new_offer")
    .notNull()
    .default("Nova oferta disponível: {titulo} - R$ {valor} no bairro {bairro}."),
  whatsappTemplateSuspension: text("whatsapp_template_suspension")
    .notNull()
    .default("Olá {nome}, sua conta foi suspensa. Entre em contato com o suporte."),
  whatsappTemplatePrivateInvite: text("whatsapp_template_private_invite")
    .notNull()
    .default("Você foi convidado para uma oferta privada!"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adminNotes = pgTable("admin_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: text("admin_id").notNull(),
  targetUserId: text("target_user_id").notNull(),
  targetType: text("target_type").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ofertasPrivadasConfig = pgTable("ofertas_privadas_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  ofertaId: uuid("oferta_id").notNull(),
  empresaId: text("empresa_id").notNull(),
  entregadorId: text("entregador_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  aceitoEm: timestamp("aceito_em"),
  notificadoEm: timestamp("notificado_em"),
  status: text("status").default("pending"),
  valorPorPacote: numeric("valor_por_pacote").default("0"),
});

// ---- Tables migrated from the original Supabase schema ----

export const entregadorLocalizacao = pgTable("entregador_localizacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  entregadorId: text("entregador_id")
    .notNull()
    .references(() => entregadores.id, { onDelete: "cascade" }),
  ofertaId: uuid("oferta_id"),
  lat: numeric("lat").notNull(),
  lng: numeric("lng").notNull(),
  velocidadeKmh: numeric("velocidade_kmh"),
  registradoEm: timestamp("registrado_em").notNull().defaultNow(),
});

export const filiais = pgTable("filiais", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: text("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  cep: text("cep"),
  rua: text("rua"),
  numero: text("numero"),
  cidade: text("cidade"),
  estado: text("estado"),
  responsavel: text("responsavel"),
  whatsapp: text("whatsapp"),
  ativa: boolean("ativa").notNull().default(true),
  pendenteAprovacao: boolean("pendente_aprovacao").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userNotifications = pgTable("user_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  titulo: text("titulo").notNull(),
  corpo: text("corpo"),
  link: text("link"),
  lida: boolean("lida").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const saidasNex = pgTable("saidas_nex", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigoNx: text("codigo_nx").notNull(),
  qrSaca: text("qr_saca").notNull(),
  entregadorId: text("entregador_id").references(() => entregadores.id, {
    onDelete: "set null",
  }),
  dataSaida: date("data_saida").notNull().defaultNow(),
  horaSaida: time("hora_saida").defaultNow(),
  status: text("status").notNull().default("saiu"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  empresaId: text("empresa_id"),
});

export const financeiroLancamentos = pgTable("financeiro_lancamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: text("empresa_id")
    .notNull()
    .references(() => empresas.id, { onDelete: "cascade" }),
  entregadorId: text("entregador_id").references(() => entregadores.id, {
    onDelete: "set null",
  }),
  tipo: text("tipo").notNull(),
  categoria: text("categoria").notNull(),
  descricao: text("descricao"),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("0"),
  dataLancamento: date("data_lancamento").notNull().defaultNow(),
  comprovanteUrl: text("comprovante_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insucessosNex = pgTable("insucessos_nex", {
  id: uuid("id").primaryKey().defaultRandom(),
  saidaId: uuid("saida_id").references(() => saidasNex.id, {
    onDelete: "cascade",
  }),
  qrPacote: text("qr_pacote").notNull(),
  motivo: text("motivo"),
  registradoEm: timestamp("registrado_em").notNull().defaultNow(),
});

export const notificacoesWhatsapp = pgTable("notificacoes_whatsapp", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: text("recipient_id").notNull(),
  destinatarioTipo: text("destinatario_tipo").notNull(),
  tipo: text("tipo").notNull(),
  mensagem: text("mensagem").notNull(),
  telefone: text("telefone"),
  status: text("status").notNull().default("pending"),
  messageId: text("message_id"),
  erroMsg: text("erro_msg"),
  enviadoEm: timestamp("enviado_em"),
  lidoEm: timestamp("lido_em"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificacoesDestinatario = pgTable("notificacoes_destinatario", {
  id: uuid("id").primaryKey().defaultRandom(),
  pacoteId: uuid("pacote_id")
    .notNull()
    .references(() => entregasPacotes.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  mensagem: text("mensagem"),
  status: text("status").notNull().default("pending"),
  enviadoEm: timestamp("enviado_em"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dispatcherCommissions = pgTable("dispatcher_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  dispatcherUserId: text("dispatcher_user_id").notNull(),
  memberUserId: text("member_user_id"),
  ofertaId: uuid("oferta_id"),
  empresaId: text("empresa_id"),
  pacotesEntregues: integer("pacotes_entregues").notNull().default(0),
  comissaoTotal: numeric("comissao_total").notNull().default("0"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  comissaoPorPacote: numeric("comissao_por_pacote"),
  dataTrabalho: date("data_trabalho"),
  dispatcherId: text("dispatcher_id"),
  quantidadePacotes: integer("quantidade_pacotes"),
  titulo: text("titulo"),
  valorEmpresa: numeric("valor_empresa"),
  valorMembro: numeric("valor_membro"),
});

export const dispatcherTeam = pgTable("dispatcher_team", {
  id: uuid("id").primaryKey().defaultRandom(),
  dispatcherId: text("dispatcher_id").notNull(),
  empresaId: text("empresa_id").notNull(),
  entregadorId: text("entregador_id").notNull(),
  status: text("status").notNull().default("pending"),
  exclusivo: boolean("exclusivo").notNull().default(false),
  exclusivoAceitoDispatcher: boolean("exclusivo_aceito_dispatcher")
    .notNull()
    .default(false),
  exclusivoAceitoEntregador: boolean("exclusivo_aceito_entregador")
    .notNull()
    .default(false),
  valorPadraoPorPacote: numeric("valor_padrao_por_pacote").notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const eventosAgenda = pgTable("eventos_agenda", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: text("empresa_id").references(() => empresas.id, {
    onDelete: "cascade",
  }),
  entregadorId: text("entregador_id"),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  cor: text("cor"),
  dataInicio: timestamp("data_inicio").notNull(),
  dataFim: timestamp("data_fim"),
  valor: numeric("valor"),
  referenciaId: text("referencia_id"),
  referenciaTabela: text("referencia_tabela"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
