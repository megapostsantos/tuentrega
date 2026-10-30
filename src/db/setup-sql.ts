// Generated from src/db/setup.sql — keep in sync
export default `-- Idempotent setup script. Split on lines containing only '-- @@'.
-- @@
DO $$ BEGIN
  CREATE TYPE "public"."app_role" AS ENUM('admin', 'empresa', 'entregador', 'dispatcher');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  CREATE TYPE "public"."pix_tipo" AS ENUM('cpf', 'cnpj', 'email', 'telefone', 'aleatoria');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  CREATE TYPE "public"."veiculo_tipo" AS ENUM('walker', 'biker', 'motoboy', 'carro', 'caminhao', 'moto_eletrica');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "admin_impersonations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"target_type" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
-- @@
CREATE TABLE IF NOT EXISTS "admin_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "admin_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"target_type" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "admin_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"deliverer_subscription_cents" integer DEFAULT 1500 NOT NULL,
	"trial_days" integer DEFAULT 14 NOT NULL,
	"fiscal_note_deadline_day" integer DEFAULT 10 NOT NULL,
	"whatsapp_template_payment" text DEFAULT 'Olá {nome}, seu pagamento de R$ {valor} foi confirmado via PIX.' NOT NULL,
	"whatsapp_template_new_offer" text DEFAULT 'Nova oferta disponível: {titulo} - R$ {valor} no bairro {bairro}.' NOT NULL,
	"whatsapp_template_suspension" text DEFAULT 'Olá {nome}, sua conta foi suspensa. Entre em contato com o suporte.' NOT NULL,
	"whatsapp_template_private_invite" text DEFAULT 'Você foi convidado para uma oferta privada!' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "agenda_previsoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" text NOT NULL,
	"data_prevista" date NOT NULL,
	"pacotes_estimados" integer DEFAULT 0 NOT NULL,
	"rotas_estimadas" integer DEFAULT 0 NOT NULL,
	"pacotes_por_rota" integer DEFAULT 0 NOT NULL,
	"valor_por_pacote" numeric DEFAULT '0' NOT NULL,
	"veiculo_necessario" text,
	"endereco_coleta" text,
	"hora_abertura" text,
	"permite_cancelamento" boolean DEFAULT false NOT NULL,
	"cancelamento_ate" timestamp,
	"status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "alocacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operacao_id" uuid NOT NULL,
	"rota_id" uuid NOT NULL,
	"entregador_id" text NOT NULL,
	"oferta_id" uuid,
	"empresa_id" text NOT NULL,
	"alocado_em" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'allocated' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "auditoria_faixas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operacao_id" uuid,
	"empresa_id" text NOT NULL,
	"descricao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rota_id" uuid,
	"faixa_inicio" integer,
	"faixa_fim" integer,
	"ordem" integer,
	"pacotes_contados" integer,
	"updated_at" timestamp DEFAULT now()
);
-- @@
CREATE TABLE IF NOT EXISTS "confiabilidade_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entregador_id" text NOT NULL,
	"operacao_id" uuid,
	"tipo" text,
	"delta" integer DEFAULT 0 NOT NULL,
	"motivo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"evento" text,
	"pontos" integer,
	"descricao" text
);
-- @@
CREATE TABLE IF NOT EXISTS "confiabilidade_score" (
	"entregador_id" text PRIMARY KEY NOT NULL,
	"score" integer DEFAULT 100 NOT NULL,
	"nivel" text DEFAULT 'gold' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "dispatcher_alocacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operacao_id" uuid NOT NULL,
	"dispatcher_id" uuid NOT NULL,
	"empresa_id" text NOT NULL,
	"pacotes_alocados" integer DEFAULT 0 NOT NULL,
	"paradas_alocadas" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending',
	"valor_por_pacote" numeric DEFAULT '0',
	"distributed_at" timestamp
);
-- @@
CREATE TABLE IF NOT EXISTS "dispatcher_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispatcher_user_id" text NOT NULL,
	"member_user_id" text,
	"oferta_id" uuid,
	"empresa_id" text,
	"pacotes_entregues" integer DEFAULT 0 NOT NULL,
	"comissao_total" numeric DEFAULT '0' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"comissao_por_pacote" numeric,
	"data_trabalho" date,
	"dispatcher_id" text,
	"quantidade_pacotes" integer,
	"titulo" text,
	"valor_empresa" numeric,
	"valor_membro" numeric
);
-- @@
CREATE TABLE IF NOT EXISTS "dispatcher_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispatcher_id" text NOT NULL,
	"empresa_id" text NOT NULL,
	"entregador_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"exclusivo" boolean DEFAULT false NOT NULL,
	"exclusivo_aceito_dispatcher" boolean DEFAULT false NOT NULL,
	"exclusivo_aceito_entregador" boolean DEFAULT false NOT NULL,
	"valor_padrao_por_pacote" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "dispatchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entregador_id" text NOT NULL,
	"empresa_id" text NOT NULL,
	"valor_por_pacote" numeric DEFAULT '0' NOT NULL,
	"plataformas" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'ativo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "empresas" (
	"id" text PRIMARY KEY NOT NULL,
	"razao_social" text NOT NULL,
	"cnpj" text NOT NULL,
	"nome_fantasia" text,
	"segmento" text,
	"cep" text,
	"rua" text,
	"numero" text,
	"complemento" text,
	"bairro" text,
	"cidade" text,
	"estado" text,
	"whatsapp" text,
	"responsavel" text,
	"plano" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'ativo' NOT NULL,
	"trial_ends_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"tms_metodo_padrao" text,
	"tms_mostrar_margem" boolean DEFAULT false,
	"tms_pacotes_por_rota" integer,
	"tms_valor_padrao_pacote" numeric,
	CONSTRAINT "empresas_cnpj_unique" UNIQUE("cnpj")
);
-- @@
CREATE TABLE IF NOT EXISTS "entregador_localizacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entregador_id" text NOT NULL,
	"oferta_id" uuid,
	"lat" numeric NOT NULL,
	"lng" numeric NOT NULL,
	"velocidade_kmh" numeric,
	"registrado_em" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "entregadores" (
	"id" text PRIMARY KEY NOT NULL,
	"nome_completo" text NOT NULL,
	"cpf" text NOT NULL,
	"whatsapp" text,
	"tipo_veiculo" "veiculo_tipo",
	"bairros" text[] DEFAULT '{}' NOT NULL,
	"pix_tipo" "pix_tipo",
	"pix_chave" text,
	"banco" text,
	"data_nascimento" date,
	"selfie_url" text,
	"placa" text,
	"cep" text,
	"rua" text,
	"numero" text,
	"complemento" text,
	"bairro" text,
	"cidade" text,
	"estado" text,
	"turnos" text[] DEFAULT '{}' NOT NULL,
	"plataformas" text[] DEFAULT '{}' NOT NULL,
	"plataforma_comprovante_url" text,
	"status" text DEFAULT 'ativo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"cnpj" text,
	"email" text,
	"invited_at" timestamp,
	"modelo_veiculo" text,
	"reliability_level" text,
	"reliability_score" integer,
	"suspended_at" timestamp,
	"suspension_reason" text,
	"tipo_operacao" text,
	"tipo_pessoa" text DEFAULT 'pf',
	CONSTRAINT "entregadores_cpf_unique" UNIQUE("cpf")
);
-- @@
CREATE TABLE IF NOT EXISTS "entregas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid,
	"empresa_id" text NOT NULL,
	"entregador_id" text NOT NULL,
	"valor" numeric(10, 2) DEFAULT '0' NOT NULL,
	"exige_nota_fiscal" boolean DEFAULT false NOT NULL,
	"nota_fiscal_url" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"data_entrega" timestamp DEFAULT now() NOT NULL,
	"data_pagamento" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "entregas_ocorrencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid,
	"entregador_id" text NOT NULL,
	"empresa_id" text NOT NULL,
	"tipo" text,
	"descricao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"fotos_urls" text[] DEFAULT '{}',
	"motivo" text,
	"numero_pacote" integer,
	"package_id" text,
	"package_id_scan_method" text,
	"score_impact" integer DEFAULT 0,
	"sub_motivo" text
);
-- @@
CREATE TABLE IF NOT EXISTS "entregas_pacotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid NOT NULL,
	"numero_pacote" integer NOT NULL,
	"endereco_entrega" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"assinatura_url" text,
	"codigo_pacote" text,
	"data_agendada" date,
	"destinatario_email" text,
	"destinatario_nome" text,
	"destinatario_telefone" text,
	"distancia_anterior_metros" numeric,
	"entregue_em" timestamp,
	"foto_pod_url" text,
	"instrucoes_especiais" text,
	"janela_fim" text,
	"janela_inicio" text,
	"lat" numeric,
	"lng" numeric,
	"motivo_nao_entrega" text,
	"nome_recebedor" text,
	"nx_code" text,
	"observacao_entrega" text,
	"operacao_id" uuid,
	"ordem_otimizada" integer,
	"tempo_estimado_minutos" integer,
	"tentativas" integer DEFAULT 0,
	"token_rastreamento" text
);
-- @@
CREATE TABLE IF NOT EXISTS "eventos_agenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" text,
	"entregador_id" text,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"cor" text,
	"data_inicio" timestamp NOT NULL,
	"data_fim" timestamp,
	"valor" numeric,
	"referencia_id" text,
	"referencia_tabela" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "extratos_mensais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entregador_id" text NOT NULL,
	"mes_referencia" text NOT NULL,
	"total_entregas" integer DEFAULT 0 NOT NULL,
	"total_pacotes" integer DEFAULT 0 NOT NULL,
	"total_bruto" numeric DEFAULT '0' NOT NULL,
	"total_recebido" numeric DEFAULT '0' NOT NULL,
	"total_pendente" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "filiais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" text NOT NULL,
	"nome" text NOT NULL,
	"cep" text,
	"rua" text,
	"numero" text,
	"cidade" text,
	"estado" text,
	"responsavel" text,
	"whatsapp" text,
	"ativa" boolean DEFAULT true NOT NULL,
	"pendente_aprovacao" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "financeiro_lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" text NOT NULL,
	"entregador_id" text,
	"tipo" text NOT NULL,
	"categoria" text NOT NULL,
	"descricao" text,
	"valor" numeric(10, 2) DEFAULT '0' NOT NULL,
	"data_lancamento" date DEFAULT now() NOT NULL,
	"comprovante_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "insucessos_nex" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saida_id" uuid,
	"qr_pacote" text NOT NULL,
	"motivo" text,
	"registrado_em" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "notificacoes_destinatario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pacote_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"mensagem" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"enviado_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "notificacoes_whatsapp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" text NOT NULL,
	"destinatario_tipo" text NOT NULL,
	"tipo" text NOT NULL,
	"mensagem" text NOT NULL,
	"telefone" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"message_id" text,
	"erro_msg" text,
	"enviado_em" timestamp,
	"lido_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "ofertas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" text NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"bairro" text,
	"valor" numeric(10, 2) DEFAULT '0' NOT NULL,
	"exige_nota_fiscal" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"tipo_entrega" text,
	"veiculo_necessario" text,
	"quantidade_pacotes" integer,
	"valor_por_pacote" numeric,
	"endereco_coleta" text,
	"prazo_pagamento" text,
	"prazo_pagamento_data" date,
	"data_trabalho" date,
	"hora_inicio" time,
	"hora_fim" time,
	"expira_em" timestamp,
	"entregador_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"cancelamento_ate" timestamp,
	"closed_at" timestamp,
	"closing_notes" text,
	"data_agendada" date,
	"dispatcher_id" text,
	"filial_id" uuid,
	"operacao_id" uuid,
	"pacotes_entregues" integer,
	"pacotes_nao_entregues" integer,
	"payment_confirmed_by" text,
	"payment_date" timestamp,
	"payment_notes" text,
	"payment_status" text DEFAULT 'pending',
	"permite_cancelamento" boolean DEFAULT false,
	"previsao_id" uuid,
	"quantidade_paradas" integer,
	"rota_operacao_id" uuid,
	"tipo" text DEFAULT 'normal',
	"tipo_servico" text DEFAULT 'last_mile'
);
-- @@
CREATE TABLE IF NOT EXISTS "ofertas_privadas_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid NOT NULL,
	"empresa_id" text NOT NULL,
	"entregador_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"aceito_em" timestamp,
	"notificado_em" timestamp,
	"status" text DEFAULT 'pending',
	"valor_por_pacote" numeric DEFAULT '0'
);
-- @@
CREATE TABLE IF NOT EXISTS "operacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" text NOT NULL,
	"data_operacao" date NOT NULL,
	"total_pacotes_sistema" integer DEFAULT 0 NOT NULL,
	"total_pacotes_contados" integer DEFAULT 0 NOT NULL,
	"total_paradas" integer DEFAULT 0 NOT NULL,
	"pacotes_faltando" integer DEFAULT 0 NOT NULL,
	"pacotes_a_mais" integer DEFAULT 0 NOT NULL,
	"valor_por_pacote" numeric DEFAULT '0' NOT NULL,
	"valor_ml_por_pacote" numeric DEFAULT '2.60' NOT NULL,
	"metodo_divisao" text DEFAULT 'packages' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"filial_id" uuid,
	"nx_code" text,
	"origem" text,
	"saca_qr_code" text,
	"tipo_servico" text DEFAULT 'last_mile',
	"total_pacotes" integer
);
-- @@
CREATE TABLE IF NOT EXISTS "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" text NOT NULL,
	"entregador_id" text NOT NULL,
	"ofertas_ids" uuid[] DEFAULT '{}' NOT NULL,
	"valor_total" numeric DEFAULT '0' NOT NULL,
	"data_pagamento" timestamp DEFAULT now() NOT NULL,
	"observacao" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"nf_numero" text,
	"nf_url" text
);
-- @@
CREATE TABLE IF NOT EXISTS "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"features" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text,
	"phone" text,
	"company_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "rotas_operacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operacao_id" uuid NOT NULL,
	"empresa_id" text NOT NULL,
	"nome" text NOT NULL,
	"quantidade_pacotes" integer DEFAULT 0 NOT NULL,
	"quantidade_paradas" integer DEFAULT 0 NOT NULL,
	"valor_total" numeric DEFAULT '0' NOT NULL,
	"oferta_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "saidas_nex" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo_nx" text NOT NULL,
	"qr_saca" text NOT NULL,
	"entregador_id" text,
	"data_saida" date DEFAULT now() NOT NULL,
	"hora_saida" time DEFAULT now(),
	"status" text DEFAULT 'saiu' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"impersonatedBy" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
-- @@
CREATE TABLE IF NOT EXISTS "user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"titulo" text NOT NULL,
	"corpo" text,
	"link" text,
	"lida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" "app_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'entregador',
	"banned" boolean DEFAULT false,
	"banReason" text,
	"banExpires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
-- @@
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "id" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "accountId" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "providerId" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "userId" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "accessToken" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "refreshToken" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "idToken" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" timestamp;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" timestamp;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "scope" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "password" text;
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
-- @@
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
-- @@
ALTER TABLE "admin_impersonations" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "admin_impersonations" ADD COLUMN IF NOT EXISTS "admin_id" text;
-- @@
ALTER TABLE "admin_impersonations" ADD COLUMN IF NOT EXISTS "target_user_id" text;
-- @@
ALTER TABLE "admin_impersonations" ADD COLUMN IF NOT EXISTS "target_type" text;
-- @@
ALTER TABLE "admin_impersonations" ADD COLUMN IF NOT EXISTS "started_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "admin_impersonations" ADD COLUMN IF NOT EXISTS "ended_at" timestamp;
-- @@
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "admin_id" text;
-- @@
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "action" text;
-- @@
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "target" text;
-- @@
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "details" text;
-- @@
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "admin_notes" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "admin_notes" ADD COLUMN IF NOT EXISTS "admin_id" text;
-- @@
ALTER TABLE "admin_notes" ADD COLUMN IF NOT EXISTS "target_user_id" text;
-- @@
ALTER TABLE "admin_notes" ADD COLUMN IF NOT EXISTS "target_type" text;
-- @@
ALTER TABLE "admin_notes" ADD COLUMN IF NOT EXISTS "note" text;
-- @@
ALTER TABLE "admin_notes" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "admin_notifications" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "admin_notifications" ADD COLUMN IF NOT EXISTS "type" text;
-- @@
ALTER TABLE "admin_notifications" ADD COLUMN IF NOT EXISTS "title" text;
-- @@
ALTER TABLE "admin_notifications" ADD COLUMN IF NOT EXISTS "body" text;
-- @@
ALTER TABLE "admin_notifications" ADD COLUMN IF NOT EXISTS "link" text;
-- @@
ALTER TABLE "admin_notifications" ADD COLUMN IF NOT EXISTS "read_at" timestamp;
-- @@
ALTER TABLE "admin_notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "id" integer DEFAULT 1;
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "deliverer_subscription_cents" integer DEFAULT 1500;
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "trial_days" integer DEFAULT 14;
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "fiscal_note_deadline_day" integer DEFAULT 10;
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "whatsapp_template_payment" text DEFAULT 'Olá {nome}, seu pagamento de R$ {valor} foi confirmado via PIX.';
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "whatsapp_template_new_offer" text DEFAULT 'Nova oferta disponível: {titulo} - R$ {valor} no bairro {bairro}.';
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "whatsapp_template_suspension" text DEFAULT 'Olá {nome}, sua conta foi suspensa. Entre em contato com o suporte.';
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "whatsapp_template_private_invite" text DEFAULT 'Você foi convidado para uma oferta privada!';
-- @@
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "data_prevista" date;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "pacotes_estimados" integer DEFAULT 0;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "rotas_estimadas" integer DEFAULT 0;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "pacotes_por_rota" integer DEFAULT 0;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "valor_por_pacote" numeric DEFAULT '0';
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "veiculo_necessario" text;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "endereco_coleta" text;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "hora_abertura" text;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "permite_cancelamento" boolean DEFAULT false;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "cancelamento_ate" timestamp;
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pendente';
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "agenda_previsoes" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "operacao_id" uuid;
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "rota_id" uuid;
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "oferta_id" uuid;
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "alocado_em" timestamp DEFAULT now();
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'allocated';
-- @@
ALTER TABLE "alocacoes" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "operacao_id" uuid;
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "descricao" text;
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "rota_id" uuid;
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "faixa_inicio" integer;
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "faixa_fim" integer;
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "ordem" integer;
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "pacotes_contados" integer;
-- @@
ALTER TABLE "auditoria_faixas" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "operacao_id" uuid;
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "tipo" text;
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "delta" integer DEFAULT 0;
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "motivo" text;
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "evento" text;
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "pontos" integer;
-- @@
ALTER TABLE "confiabilidade_historico" ADD COLUMN IF NOT EXISTS "descricao" text;
-- @@
ALTER TABLE "confiabilidade_score" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "confiabilidade_score" ADD COLUMN IF NOT EXISTS "score" integer DEFAULT 100;
-- @@
ALTER TABLE "confiabilidade_score" ADD COLUMN IF NOT EXISTS "nivel" text DEFAULT 'gold';
-- @@
ALTER TABLE "confiabilidade_score" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "operacao_id" uuid;
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "dispatcher_id" uuid;
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "pacotes_alocados" integer DEFAULT 0;
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "paradas_alocadas" integer DEFAULT 0;
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "notes" text;
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "valor_por_pacote" numeric DEFAULT '0';
-- @@
ALTER TABLE "dispatcher_alocacoes" ADD COLUMN IF NOT EXISTS "distributed_at" timestamp;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "dispatcher_user_id" text;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "member_user_id" text;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "oferta_id" uuid;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "pacotes_entregues" integer DEFAULT 0;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "comissao_total" numeric DEFAULT '0';
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending';
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "closed_at" timestamp;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "comissao_por_pacote" numeric;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "data_trabalho" date;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "dispatcher_id" text;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "quantidade_pacotes" integer;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "titulo" text;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "valor_empresa" numeric;
-- @@
ALTER TABLE "dispatcher_commissions" ADD COLUMN IF NOT EXISTS "valor_membro" numeric;
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "dispatcher_id" text;
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "exclusivo" boolean DEFAULT false;
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "exclusivo_aceito_dispatcher" boolean DEFAULT false;
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "exclusivo_aceito_entregador" boolean DEFAULT false;
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "valor_padrao_por_pacote" numeric DEFAULT '0';
-- @@
ALTER TABLE "dispatcher_team" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "dispatchers" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "dispatchers" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "dispatchers" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "dispatchers" ADD COLUMN IF NOT EXISTS "valor_por_pacote" numeric DEFAULT '0';
-- @@
ALTER TABLE "dispatchers" ADD COLUMN IF NOT EXISTS "plataformas" text[] DEFAULT '{}';
-- @@
ALTER TABLE "dispatchers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ativo';
-- @@
ALTER TABLE "dispatchers" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "id" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "razao_social" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "cnpj" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "nome_fantasia" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "segmento" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "cep" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "rua" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "numero" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "complemento" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "bairro" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "cidade" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "estado" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "whatsapp" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "responsavel" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "plano" text DEFAULT 'free';
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ativo';
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "tms_metodo_padrao" text;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "tms_mostrar_margem" boolean DEFAULT false;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "tms_pacotes_por_rota" integer;
-- @@
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "tms_valor_padrao_pacote" numeric;
-- @@
ALTER TABLE "entregador_localizacao" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "entregador_localizacao" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "entregador_localizacao" ADD COLUMN IF NOT EXISTS "oferta_id" uuid;
-- @@
ALTER TABLE "entregador_localizacao" ADD COLUMN IF NOT EXISTS "lat" numeric;
-- @@
ALTER TABLE "entregador_localizacao" ADD COLUMN IF NOT EXISTS "lng" numeric;
-- @@
ALTER TABLE "entregador_localizacao" ADD COLUMN IF NOT EXISTS "velocidade_kmh" numeric;
-- @@
ALTER TABLE "entregador_localizacao" ADD COLUMN IF NOT EXISTS "registrado_em" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "id" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "nome_completo" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "cpf" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "whatsapp" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "tipo_veiculo" "veiculo_tipo";
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "bairros" text[] DEFAULT '{}';
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "pix_tipo" "pix_tipo";
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "pix_chave" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "banco" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "data_nascimento" date;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "selfie_url" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "placa" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "cep" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "rua" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "numero" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "complemento" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "bairro" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "cidade" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "estado" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "turnos" text[] DEFAULT '{}';
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "plataformas" text[] DEFAULT '{}';
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "plataforma_comprovante_url" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ativo';
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "activated_at" timestamp;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "cnpj" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "email" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "invited_at" timestamp;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "modelo_veiculo" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "reliability_level" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "reliability_score" integer;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "suspension_reason" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "tipo_operacao" text;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "tipo_pessoa" text DEFAULT 'pf';
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "oferta_id" uuid;
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "valor" numeric(10, 2) DEFAULT '0';
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "exige_nota_fiscal" boolean DEFAULT false;
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "nota_fiscal_url" text;
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pendente';
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "data_entrega" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "data_pagamento" timestamp;
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregas" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "oferta_id" uuid;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "tipo" text;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "descricao" text;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "fotos_urls" text[] DEFAULT '{}';
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "motivo" text;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "numero_pacote" integer;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "package_id" text;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "package_id_scan_method" text;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "score_impact" integer DEFAULT 0;
-- @@
ALTER TABLE "entregas_ocorrencias" ADD COLUMN IF NOT EXISTS "sub_motivo" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "oferta_id" uuid;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "numero_pacote" integer;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "endereco_entrega" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "assinatura_url" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "codigo_pacote" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "data_agendada" date;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "destinatario_email" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "destinatario_nome" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "destinatario_telefone" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "distancia_anterior_metros" numeric;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "entregue_em" timestamp;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "foto_pod_url" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "instrucoes_especiais" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "janela_fim" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "janela_inicio" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "lat" numeric;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "lng" numeric;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "motivo_nao_entrega" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "nome_recebedor" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "nx_code" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "observacao_entrega" text;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "operacao_id" uuid;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "ordem_otimizada" integer;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "tempo_estimado_minutos" integer;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "tentativas" integer DEFAULT 0;
-- @@
ALTER TABLE "entregas_pacotes" ADD COLUMN IF NOT EXISTS "token_rastreamento" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "tipo" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "titulo" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "descricao" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "cor" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "data_inicio" timestamp;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "data_fim" timestamp;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "valor" numeric;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "referencia_id" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "referencia_tabela" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "created_by" text;
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "eventos_agenda" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "mes_referencia" text;
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "total_entregas" integer DEFAULT 0;
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "total_pacotes" integer DEFAULT 0;
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "total_bruto" numeric DEFAULT '0';
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "total_recebido" numeric DEFAULT '0';
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "total_pendente" numeric DEFAULT '0';
-- @@
ALTER TABLE "extratos_mensais" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "nome" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "cep" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "rua" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "numero" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "cidade" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "estado" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "responsavel" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "whatsapp" text;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "ativa" boolean DEFAULT true;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "pendente_aprovacao" boolean DEFAULT false;
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "filiais" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "tipo" text;
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "categoria" text;
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "descricao" text;
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "valor" numeric(10, 2) DEFAULT '0';
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "data_lancamento" date DEFAULT now();
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "comprovante_url" text;
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "financeiro_lancamentos" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "insucessos_nex" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "insucessos_nex" ADD COLUMN IF NOT EXISTS "saida_id" uuid;
-- @@
ALTER TABLE "insucessos_nex" ADD COLUMN IF NOT EXISTS "qr_pacote" text;
-- @@
ALTER TABLE "insucessos_nex" ADD COLUMN IF NOT EXISTS "motivo" text;
-- @@
ALTER TABLE "insucessos_nex" ADD COLUMN IF NOT EXISTS "registrado_em" timestamp DEFAULT now();
-- @@
ALTER TABLE "notificacoes_destinatario" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "notificacoes_destinatario" ADD COLUMN IF NOT EXISTS "pacote_id" uuid;
-- @@
ALTER TABLE "notificacoes_destinatario" ADD COLUMN IF NOT EXISTS "tipo" text;
-- @@
ALTER TABLE "notificacoes_destinatario" ADD COLUMN IF NOT EXISTS "mensagem" text;
-- @@
ALTER TABLE "notificacoes_destinatario" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
-- @@
ALTER TABLE "notificacoes_destinatario" ADD COLUMN IF NOT EXISTS "enviado_em" timestamp;
-- @@
ALTER TABLE "notificacoes_destinatario" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "notificacoes_destinatario" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "recipient_id" text;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "destinatario_tipo" text;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "tipo" text;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "mensagem" text;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "telefone" text;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "message_id" text;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "erro_msg" text;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "enviado_em" timestamp;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "lido_em" timestamp;
-- @@
ALTER TABLE "notificacoes_whatsapp" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "titulo" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "descricao" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "bairro" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "valor" numeric(10, 2) DEFAULT '0';
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "exige_nota_fiscal" boolean DEFAULT false;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'open';
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "tipo_entrega" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "veiculo_necessario" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "quantidade_pacotes" integer;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "valor_por_pacote" numeric;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "endereco_coleta" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "prazo_pagamento" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "prazo_pagamento_data" date;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "data_trabalho" date;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "hora_inicio" time;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "hora_fim" time;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "expira_em" timestamp;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "cancelamento_ate" timestamp;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "closed_at" timestamp;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "closing_notes" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "data_agendada" date;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "dispatcher_id" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "filial_id" uuid;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "operacao_id" uuid;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "pacotes_entregues" integer;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "pacotes_nao_entregues" integer;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "payment_confirmed_by" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "payment_date" timestamp;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "payment_notes" text;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending';
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "permite_cancelamento" boolean DEFAULT false;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "previsao_id" uuid;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "quantidade_paradas" integer;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "rota_operacao_id" uuid;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "tipo" text DEFAULT 'normal';
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "tipo_servico" text DEFAULT 'last_mile';
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "oferta_id" uuid;
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "aceito_em" timestamp;
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "notificado_em" timestamp;
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
-- @@
ALTER TABLE "ofertas_privadas_config" ADD COLUMN IF NOT EXISTS "valor_por_pacote" numeric DEFAULT '0';
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "data_operacao" date;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "total_pacotes_sistema" integer DEFAULT 0;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "total_pacotes_contados" integer DEFAULT 0;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "total_paradas" integer DEFAULT 0;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "pacotes_faltando" integer DEFAULT 0;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "pacotes_a_mais" integer DEFAULT 0;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "valor_por_pacote" numeric DEFAULT '0';
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "valor_ml_por_pacote" numeric DEFAULT '2.60';
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "metodo_divisao" text DEFAULT 'packages';
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft';
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "observacoes" text;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "filial_id" uuid;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "nx_code" text;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "origem" text;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "saca_qr_code" text;
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "tipo_servico" text DEFAULT 'last_mile';
-- @@
ALTER TABLE "operacoes" ADD COLUMN IF NOT EXISTS "total_pacotes" integer;
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "ofertas_ids" uuid[] DEFAULT '{}';
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "valor_total" numeric DEFAULT '0';
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "data_pagamento" timestamp DEFAULT now();
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "observacao" text;
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "created_by" text;
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "nf_numero" text;
-- @@
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "nf_url" text;
-- @@
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "id" text;
-- @@
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "name" text;
-- @@
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "price_cents" integer DEFAULT 0;
-- @@
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "trial_days" integer DEFAULT 0;
-- @@
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "features" text DEFAULT '[]';
-- @@
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "id" text;
-- @@
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "full_name" text;
-- @@
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "phone" text;
-- @@
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "company_name" text;
-- @@
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "operacao_id" uuid;
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "nome" text;
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "quantidade_pacotes" integer DEFAULT 0;
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "quantidade_paradas" integer DEFAULT 0;
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "valor_total" numeric DEFAULT '0';
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "oferta_id" uuid;
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft';
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "rotas_operacao" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "codigo_nx" text;
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "qr_saca" text;
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "entregador_id" text;
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "data_saida" date DEFAULT now();
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "hora_saida" time DEFAULT now();
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'saiu';
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "id" text;
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp;
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "token" text;
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ipAddress" text;
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "userAgent" text;
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "userId" text;
-- @@
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonatedBy" text;
-- @@
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "user_id" text;
-- @@
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "titulo" text;
-- @@
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "corpo" text;
-- @@
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "link" text;
-- @@
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "lida" boolean DEFAULT false;
-- @@
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
-- @@
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "user_id" text;
-- @@
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "role" "app_role";
-- @@
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "id" text;
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "name" text;
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "email" text;
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "emailVerified" boolean DEFAULT false;
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "image" text;
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'entregador';
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason" text;
-- @@
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banExpires" timestamp;
-- @@
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "id" text;
-- @@
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "identifier" text;
-- @@
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "value" text;
-- @@
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp;
-- @@
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
-- @@
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
-- @@
DO $$ BEGIN
  ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "empresas" ADD CONSTRAINT "empresas_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "entregador_localizacao" ADD CONSTRAINT "entregador_localizacao_entregador_id_entregadores_id_fk" FOREIGN KEY ("entregador_id") REFERENCES "public"."entregadores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "entregadores" ADD CONSTRAINT "entregadores_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "entregas" ADD CONSTRAINT "entregas_oferta_id_ofertas_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."ofertas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "entregas" ADD CONSTRAINT "entregas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "entregas" ADD CONSTRAINT "entregas_entregador_id_entregadores_id_fk" FOREIGN KEY ("entregador_id") REFERENCES "public"."entregadores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "filiais" ADD CONSTRAINT "filiais_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "financeiro_lancamentos" ADD CONSTRAINT "financeiro_lancamentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "financeiro_lancamentos" ADD CONSTRAINT "financeiro_lancamentos_entregador_id_entregadores_id_fk" FOREIGN KEY ("entregador_id") REFERENCES "public"."entregadores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "insucessos_nex" ADD CONSTRAINT "insucessos_nex_saida_id_saidas_nex_id_fk" FOREIGN KEY ("saida_id") REFERENCES "public"."saidas_nex"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "notificacoes_destinatario" ADD CONSTRAINT "notificacoes_destinatario_pacote_id_entregas_pacotes_id_fk" FOREIGN KEY ("pacote_id") REFERENCES "public"."entregas_pacotes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "rotas_operacao" ADD CONSTRAINT "rotas_operacao_operacao_id_operacoes_id_fk" FOREIGN KEY ("operacao_id") REFERENCES "public"."operacoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "saidas_nex" ADD CONSTRAINT "saidas_nex_entregador_id_entregadores_id_fk" FOREIGN KEY ("entregador_id") REFERENCES "public"."entregadores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
DO $$ BEGIN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- @@
CREATE INDEX IF NOT EXISTS "idx_entregas_empresa" ON "entregas" USING btree ("empresa_id","data_entrega");
-- @@
CREATE INDEX IF NOT EXISTS "idx_entregas_entregador" ON "entregas" USING btree ("entregador_id","data_entrega");
-- @@
CREATE INDEX IF NOT EXISTS "idx_operacoes_empresa" ON "operacoes" USING btree ("empresa_id","data_operacao");
-- @@
CREATE INDEX IF NOT EXISTS "idx_pagamentos_empresa" ON "pagamentos" USING btree ("empresa_id","data_pagamento");
-- @@
CREATE INDEX IF NOT EXISTS "idx_pagamentos_entregador" ON "pagamentos" USING btree ("entregador_id","data_pagamento");
-- @@
CREATE INDEX IF NOT EXISTS "idx_rotas_operacao_op" ON "rotas_operacao" USING btree ("operacao_id");
-- @@
CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_role_idx" ON "user_roles" USING btree ("user_id","role");
-- @@
ALTER TABLE "empresas" ALTER COLUMN "cnpj" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "cpf" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ADD COLUMN IF NOT EXISTS "marca_veiculo" text;
-- @@
ALTER TABLE "saidas_nex" ADD COLUMN IF NOT EXISTS "empresa_id" text;
-- @@
CREATE UNIQUE INDEX IF NOT EXISTS "entregas_oferta_id_unique" ON "entregas" ("oferta_id");
-- @@
CREATE UNIQUE INDEX IF NOT EXISTS "dispatchers_entregador_empresa_unique" ON "dispatchers" ("entregador_id","empresa_id");
-- @@
ALTER TABLE "admin_impersonations" ALTER COLUMN "ended_at" DROP NOT NULL;
-- @@
ALTER TABLE "admin_logs" ALTER COLUMN "target" DROP NOT NULL;
-- @@
ALTER TABLE "admin_logs" ALTER COLUMN "details" DROP NOT NULL;
-- @@
ALTER TABLE "admin_notifications" ALTER COLUMN "body" DROP NOT NULL;
-- @@
ALTER TABLE "admin_notifications" ALTER COLUMN "link" DROP NOT NULL;
-- @@
ALTER TABLE "admin_notifications" ALTER COLUMN "read_at" DROP NOT NULL;
-- @@
ALTER TABLE "agenda_previsoes" ALTER COLUMN "veiculo_necessario" DROP NOT NULL;
-- @@
ALTER TABLE "agenda_previsoes" ALTER COLUMN "endereco_coleta" DROP NOT NULL;
-- @@
ALTER TABLE "agenda_previsoes" ALTER COLUMN "hora_abertura" DROP NOT NULL;
-- @@
ALTER TABLE "agenda_previsoes" ALTER COLUMN "cancelamento_ate" DROP NOT NULL;
-- @@
ALTER TABLE "alocacoes" ALTER COLUMN "oferta_id" DROP NOT NULL;
-- @@
ALTER TABLE "auditoria_faixas" ALTER COLUMN "operacao_id" DROP NOT NULL;
-- @@
ALTER TABLE "auditoria_faixas" ALTER COLUMN "descricao" DROP NOT NULL;
-- @@
ALTER TABLE "auditoria_faixas" ALTER COLUMN "rota_id" DROP NOT NULL;
-- @@
ALTER TABLE "auditoria_faixas" ALTER COLUMN "faixa_inicio" DROP NOT NULL;
-- @@
ALTER TABLE "auditoria_faixas" ALTER COLUMN "faixa_fim" DROP NOT NULL;
-- @@
ALTER TABLE "auditoria_faixas" ALTER COLUMN "ordem" DROP NOT NULL;
-- @@
ALTER TABLE "auditoria_faixas" ALTER COLUMN "pacotes_contados" DROP NOT NULL;
-- @@
ALTER TABLE "auditoria_faixas" ALTER COLUMN "updated_at" DROP NOT NULL;
-- @@
ALTER TABLE "confiabilidade_historico" ALTER COLUMN "operacao_id" DROP NOT NULL;
-- @@
ALTER TABLE "confiabilidade_historico" ALTER COLUMN "tipo" DROP NOT NULL;
-- @@
ALTER TABLE "confiabilidade_historico" ALTER COLUMN "motivo" DROP NOT NULL;
-- @@
ALTER TABLE "confiabilidade_historico" ALTER COLUMN "evento" DROP NOT NULL;
-- @@
ALTER TABLE "confiabilidade_historico" ALTER COLUMN "pontos" DROP NOT NULL;
-- @@
ALTER TABLE "confiabilidade_historico" ALTER COLUMN "descricao" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_alocacoes" ALTER COLUMN "notes" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_alocacoes" ALTER COLUMN "status" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_alocacoes" ALTER COLUMN "valor_por_pacote" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_alocacoes" ALTER COLUMN "distributed_at" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "member_user_id" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "oferta_id" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "empresa_id" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "closed_at" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "comissao_por_pacote" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "data_trabalho" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "dispatcher_id" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "quantidade_pacotes" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "titulo" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "valor_empresa" DROP NOT NULL;
-- @@
ALTER TABLE "dispatcher_commissions" ALTER COLUMN "valor_membro" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "cnpj" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "nome_fantasia" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "segmento" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "cep" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "rua" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "numero" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "complemento" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "bairro" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "cidade" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "estado" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "whatsapp" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "responsavel" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "tms_metodo_padrao" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "tms_mostrar_margem" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "tms_pacotes_por_rota" DROP NOT NULL;
-- @@
ALTER TABLE "empresas" ALTER COLUMN "tms_valor_padrao_pacote" DROP NOT NULL;
-- @@
ALTER TABLE "entregador_localizacao" ALTER COLUMN "oferta_id" DROP NOT NULL;
-- @@
ALTER TABLE "entregador_localizacao" ALTER COLUMN "velocidade_kmh" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "cpf" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "whatsapp" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "tipo_veiculo" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "pix_tipo" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "pix_chave" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "banco" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "data_nascimento" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "selfie_url" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "placa" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "cep" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "rua" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "numero" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "complemento" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "bairro" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "cidade" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "estado" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "plataforma_comprovante_url" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "activated_at" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "cnpj" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "email" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "invited_at" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "modelo_veiculo" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "marca_veiculo" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "reliability_level" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "reliability_score" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "suspended_at" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "suspension_reason" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "tipo_operacao" DROP NOT NULL;
-- @@
ALTER TABLE "entregadores" ALTER COLUMN "tipo_pessoa" DROP NOT NULL;
-- @@
ALTER TABLE "entregas" ALTER COLUMN "oferta_id" DROP NOT NULL;
-- @@
ALTER TABLE "entregas" ALTER COLUMN "nota_fiscal_url" DROP NOT NULL;
-- @@
ALTER TABLE "entregas" ALTER COLUMN "data_pagamento" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "oferta_id" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "tipo" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "descricao" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "fotos_urls" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "motivo" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "numero_pacote" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "package_id" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "package_id_scan_method" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "score_impact" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_ocorrencias" ALTER COLUMN "sub_motivo" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "endereco_entrega" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "assinatura_url" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "codigo_pacote" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "data_agendada" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "destinatario_email" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "destinatario_nome" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "destinatario_telefone" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "distancia_anterior_metros" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "entregue_em" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "foto_pod_url" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "instrucoes_especiais" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "janela_fim" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "janela_inicio" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "lat" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "lng" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "motivo_nao_entrega" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "nome_recebedor" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "nx_code" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "observacao_entrega" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "operacao_id" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "ordem_otimizada" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "tempo_estimado_minutos" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "tentativas" DROP NOT NULL;
-- @@
ALTER TABLE "entregas_pacotes" ALTER COLUMN "token_rastreamento" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "empresa_id" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "entregador_id" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "descricao" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "cor" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "data_fim" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "valor" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "referencia_id" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "referencia_tabela" DROP NOT NULL;
-- @@
ALTER TABLE "eventos_agenda" ALTER COLUMN "created_by" DROP NOT NULL;
-- @@
ALTER TABLE "filiais" ALTER COLUMN "cep" DROP NOT NULL;
-- @@
ALTER TABLE "filiais" ALTER COLUMN "rua" DROP NOT NULL;
-- @@
ALTER TABLE "filiais" ALTER COLUMN "numero" DROP NOT NULL;
-- @@
ALTER TABLE "filiais" ALTER COLUMN "cidade" DROP NOT NULL;
-- @@
ALTER TABLE "filiais" ALTER COLUMN "estado" DROP NOT NULL;
-- @@
ALTER TABLE "filiais" ALTER COLUMN "responsavel" DROP NOT NULL;
-- @@
ALTER TABLE "filiais" ALTER COLUMN "whatsapp" DROP NOT NULL;
-- @@
ALTER TABLE "financeiro_lancamentos" ALTER COLUMN "entregador_id" DROP NOT NULL;
-- @@
ALTER TABLE "financeiro_lancamentos" ALTER COLUMN "descricao" DROP NOT NULL;
-- @@
ALTER TABLE "financeiro_lancamentos" ALTER COLUMN "comprovante_url" DROP NOT NULL;
-- @@
ALTER TABLE "insucessos_nex" ALTER COLUMN "saida_id" DROP NOT NULL;
-- @@
ALTER TABLE "insucessos_nex" ALTER COLUMN "motivo" DROP NOT NULL;
-- @@
ALTER TABLE "notificacoes_destinatario" ALTER COLUMN "mensagem" DROP NOT NULL;
-- @@
ALTER TABLE "notificacoes_destinatario" ALTER COLUMN "enviado_em" DROP NOT NULL;
-- @@
ALTER TABLE "notificacoes_whatsapp" ALTER COLUMN "telefone" DROP NOT NULL;
-- @@
ALTER TABLE "notificacoes_whatsapp" ALTER COLUMN "message_id" DROP NOT NULL;
-- @@
ALTER TABLE "notificacoes_whatsapp" ALTER COLUMN "erro_msg" DROP NOT NULL;
-- @@
ALTER TABLE "notificacoes_whatsapp" ALTER COLUMN "enviado_em" DROP NOT NULL;
-- @@
ALTER TABLE "notificacoes_whatsapp" ALTER COLUMN "lido_em" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "descricao" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "bairro" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "tipo_entrega" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "veiculo_necessario" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "quantidade_pacotes" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "valor_por_pacote" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "endereco_coleta" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "prazo_pagamento" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "prazo_pagamento_data" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "data_trabalho" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "hora_inicio" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "hora_fim" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "expira_em" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "entregador_id" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "cancelamento_ate" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "closed_at" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "closing_notes" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "data_agendada" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "dispatcher_id" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "filial_id" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "operacao_id" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "pacotes_entregues" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "pacotes_nao_entregues" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "payment_confirmed_by" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "payment_date" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "payment_notes" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "payment_status" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "permite_cancelamento" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "previsao_id" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "quantidade_paradas" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "rota_operacao_id" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "tipo" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas" ALTER COLUMN "tipo_servico" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas_privadas_config" ALTER COLUMN "aceito_em" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas_privadas_config" ALTER COLUMN "notificado_em" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas_privadas_config" ALTER COLUMN "status" DROP NOT NULL;
-- @@
ALTER TABLE "ofertas_privadas_config" ALTER COLUMN "valor_por_pacote" DROP NOT NULL;
-- @@
ALTER TABLE "operacoes" ALTER COLUMN "observacoes" DROP NOT NULL;
-- @@
ALTER TABLE "operacoes" ALTER COLUMN "filial_id" DROP NOT NULL;
-- @@
ALTER TABLE "operacoes" ALTER COLUMN "nx_code" DROP NOT NULL;
-- @@
ALTER TABLE "operacoes" ALTER COLUMN "origem" DROP NOT NULL;
-- @@
ALTER TABLE "operacoes" ALTER COLUMN "saca_qr_code" DROP NOT NULL;
-- @@
ALTER TABLE "operacoes" ALTER COLUMN "tipo_servico" DROP NOT NULL;
-- @@
ALTER TABLE "operacoes" ALTER COLUMN "total_pacotes" DROP NOT NULL;
-- @@
ALTER TABLE "pagamentos" ALTER COLUMN "observacao" DROP NOT NULL;
-- @@
ALTER TABLE "pagamentos" ALTER COLUMN "created_by" DROP NOT NULL;
-- @@
ALTER TABLE "pagamentos" ALTER COLUMN "nf_numero" DROP NOT NULL;
-- @@
ALTER TABLE "pagamentos" ALTER COLUMN "nf_url" DROP NOT NULL;
-- @@
ALTER TABLE "profiles" ALTER COLUMN "full_name" DROP NOT NULL;
-- @@
ALTER TABLE "profiles" ALTER COLUMN "phone" DROP NOT NULL;
-- @@
ALTER TABLE "profiles" ALTER COLUMN "company_name" DROP NOT NULL;
-- @@
ALTER TABLE "rotas_operacao" ALTER COLUMN "oferta_id" DROP NOT NULL;
-- @@
ALTER TABLE "saidas_nex" ALTER COLUMN "entregador_id" DROP NOT NULL;
-- @@
ALTER TABLE "saidas_nex" ALTER COLUMN "hora_saida" DROP NOT NULL;
-- @@
ALTER TABLE "saidas_nex" ALTER COLUMN "empresa_id" DROP NOT NULL;
-- @@
ALTER TABLE "user_notifications" ALTER COLUMN "corpo" DROP NOT NULL;
-- @@
ALTER TABLE "user_notifications" ALTER COLUMN "link" DROP NOT NULL;
-- @@
CREATE TABLE IF NOT EXISTS "agenda_compromissos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"previsao_id" uuid NOT NULL,
	"empresa_id" text NOT NULL,
	"entregador_id" text NOT NULL,
	"pacotes_comprometidos" integer DEFAULT 0 NOT NULL,
	"pacotes_ajustados" integer,
	"status" text DEFAULT 'comprometido' NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_compromissos_unique" ON "agenda_compromissos" ("previsao_id","entregador_id");
-- @@
CREATE TABLE IF NOT EXISTS "ofertas_recusas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid NOT NULL,
	"empresa_id" text NOT NULL,
	"entregador_id" text NOT NULL,
	"origem" text DEFAULT 'entregador' NOT NULL,
	"motivo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE INDEX IF NOT EXISTS "idx_ofertas_recusas_oferta" ON "ofertas_recusas" ("oferta_id","entregador_id");
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "atribuida_em" timestamp;
-- @@
ALTER TABLE "ofertas" ADD COLUMN IF NOT EXISTS "iniciada_em" timestamp;
-- @@
ALTER TABLE "ofertas_recusas" ADD COLUMN IF NOT EXISTS "penalizada" boolean DEFAULT false NOT NULL;
-- @@
ALTER TABLE "ofertas_recusas" ADD COLUMN IF NOT EXISTS "pontos" integer;
-- @@
CREATE INDEX IF NOT EXISTS "idx_localizacao_oferta" ON "entregador_localizacao" ("oferta_id","registrado_em");
-- @@
CREATE INDEX IF NOT EXISTS "idx_localizacao_entregador" ON "entregador_localizacao" ("entregador_id","registrado_em");
-- @@
CREATE TABLE IF NOT EXISTS "config_pagamento" (
	"empresa_id" text PRIMARY KEY NOT NULL,
	"ciclo" text DEFAULT 'quinzenal' NOT NULL,
	"antecipacao_ativa" boolean DEFAULT false NOT NULL,
	"antecipacao_percentual" numeric(5, 2) DEFAULT '10' NOT NULL,
	"limite_percentual" integer DEFAULT 100 NOT NULL,
	"valor_minimo" numeric(10, 2) DEFAULT '50' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "antecipacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" text NOT NULL,
	"entregador_id" text NOT NULL,
	"valor_bruto" numeric(10, 2) NOT NULL,
	"percentual" numeric(5, 2) NOT NULL,
	"desconto" numeric(10, 2) NOT NULL,
	"valor_liquido" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'solicitada' NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decidida_em" timestamp,
	"paga_em" timestamp,
	"abatida_em" timestamp
);
-- @@
CREATE INDEX IF NOT EXISTS "idx_antecipacoes_empresa" ON "antecipacoes" ("empresa_id","status");
-- @@
CREATE INDEX IF NOT EXISTS "idx_antecipacoes_entregador" ON "antecipacoes" ("entregador_id","created_at");
-- @@
CREATE TABLE IF NOT EXISTS "entregadores_gerenciados" (
	"entregador_id" text PRIMARY KEY NOT NULL,
	"empresa_id" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "entregador_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entregador_id" text NOT NULL,
	"empresa_id" text NOT NULL,
	"tipo" text NOT NULL,
	"path" text NOT NULL,
	"nome_arquivo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- @@
CREATE TABLE IF NOT EXISTS "senhas_provisorias" ("user_id" text PRIMARY KEY NOT NULL, "criada_em" timestamp DEFAULT now() NOT NULL);
-- @@
CREATE INDEX IF NOT EXISTS "idx_gerenciados_empresa" ON "entregadores_gerenciados" ("empresa_id");
-- @@
CREATE INDEX IF NOT EXISTS "idx_documentos_entregador" ON "entregador_documentos" ("entregador_id");
-- @@
CREATE TABLE IF NOT EXISTS "fechamentos_gestor" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "oferta_id" text NOT NULL, "empresa_id" text NOT NULL, "entregador_id" text, "entregues" integer DEFAULT 0 NOT NULL, "insucessos" integer DEFAULT 0 NOT NULL, "pendentes" integer DEFAULT 0 NOT NULL, "observacao" text, "status" text DEFAULT 'a_conferir' NOT NULL, "nota" text, "criado_em" timestamp DEFAULT now() NOT NULL, "conferido_em" timestamp);
-- @@
CREATE INDEX IF NOT EXISTS "idx_fechamentos_oferta" ON "fechamentos_gestor" ("oferta_id");
`;
