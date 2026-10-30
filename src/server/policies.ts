// Autorização por linha (substitui o RLS do Supabase). Regras por tabela e por perfil.
// Tabela sem política = acesso negado para não-admin.

export type Role = "admin" | "empresa" | "entregador" | "dispatcher";
export type P = (v: unknown) => string; // registra um parâmetro e devolve "$n"
export type Pred = (a: string, p: P, uid: string) => string;
export type Run = (text: string, params?: unknown[]) => Promise<any[]>;
export type InsertCheck = (row: Record<string, unknown>, uid: string, run: Run) => Promise<string | null>;
type Rule<T> = Partial<Record<Role, T>>;

export interface Policy {
  read?: Rule<boolean | Pred>;
  update?: Rule<boolean | Pred>;
  delete?: Rule<boolean | Pred>;
  insert?: Rule<boolean | InsertCheck>;
  updateCols?: Rule<string[]>;
  updateCheck?: Rule<(vals: Record<string, unknown>, uid: string) => string | null>;
  mask?: Rule<{ cols: string[]; unless?: Pred }>;
  force?: Rule<Record<string, "uid">>;
}

export function ruleFor<T>(rule: Rule<T> | undefined, role: Role): T | undefined {
  if (!rule) return undefined;
  if (role === "dispatcher") return rule.dispatcher ?? rule.entregador;
  return rule[role];
}

const col = (a: string, c: string) => `"${a}"."${c}"`;
const eq = (c: string): Pred => (a, p, u) => `${col(a, c)}::text = ${p(u)}`;
const or = (...ps: Pred[]): Pred => (a, p, u) => `(${ps.map((f) => f(a, p, u)).join(" or ")})`;
const and = (...ps: Pred[]): Pred => (a, p, u) => `(${ps.map((f) => f(a, p, u)).join(" and ")})`;
const raw = (fn: (a: string, p: P, u: string) => string): Pred => fn;

const ownCol = (c: string): InsertCheck => async (row, uid) =>
  row[c] === undefined || row[c] === null || String(row[c]) === uid ? null : `Valor inválido em ${c}`;

// ----- Relações reutilizáveis -----
const meDispatcherIds = (u: string, p: P) =>
  `(select d."id"::text from "dispatchers" d where d."entregador_id"::text = ${p(u)})`;

const ofertaDoEntregador: Pred = (a, p, u) =>
  `exists (select 1 from "ofertas" o where o."id"::text = ${col(a, "oferta_id")}::text and o."entregador_id"::text = ${p(u)})`;
const ofertaDaEmpresa: Pred = (a, p, u) =>
  `exists (select 1 from "ofertas" o where o."id"::text = ${col(a, "oferta_id")}::text and o."empresa_id"::text = ${p(u)})`;
const operacaoDaEmpresa: Pred = (a, p, u) =>
  `exists (select 1 from "operacoes" op where op."id"::text = ${col(a, "operacao_id")}::text and op."empresa_id"::text = ${p(u)})`;

const naoRecusada: Pred = (a, p, u) =>
  `not exists (select 1 from "ofertas_recusas" rc where rc."oferta_id"::text = ${col(a, "id")}::text and rc."entregador_id"::text = ${p(u)} and rc."origem" <> 'sistema')`;
const marketplace: Pred = (a, p, u) =>
  `(${col(a, "status")} = 'open' and coalesce(${col(a, "tipo")}, 'normal') <> 'private' and ${naoRecusada(a, p, u)})`;
const convidado: Pred = (a, p, u) =>
  `exists (select 1 from "ofertas_privadas_config" c where c."oferta_id"::text = ${col(a, "id")}::text and c."entregador_id"::text = ${p(u)})`;
const dispatcherDono: Pred = (a, p, u) => `${col(a, "dispatcher_id")}::text in ${meDispatcherIds(u, p)}`;
const ofertaVisivelEntregador: Pred = or(eq("entregador_id"), marketplace, convidado, dispatcherDono);
const ofertaAceitavel: Pred = (a, p, u) =>
  `(${col(a, "entregador_id")} is null and ${col(a, "status")} = 'open' and (coalesce(${col(a, "tipo")}, 'normal') <> 'private' or ${convidado(a, p, u)}) and ${naoRecusada(a, p, u)})`;

const entregadorTrabalhaParaEmpresa: Pred = (a, p, u) =>
  `(exists (select 1 from "ofertas" o where o."entregador_id"::text = ${col(a, "id")}::text and o."empresa_id"::text = ${p(u)})
    or exists (select 1 from "dispatchers" d where d."entregador_id"::text = ${col(a, "id")}::text and d."empresa_id"::text = ${p(u)})
    or exists (select 1 from "entregas" en where en."entregador_id"::text = ${col(a, "id")}::text and en."empresa_id"::text = ${p(u)})
    or exists (select 1 from "antecipacoes" an where an."entregador_id"::text = ${col(a, "id")}::text and an."empresa_id"::text = ${p(u)})
    or exists (select 1 from "entregadores_gerenciados" g where g."entregador_id"::text = ${col(a, "id")}::text and g."empresa_id"::text = ${p(u)}))`;
const entregadorDoMeuTime: Pred = (a, p, u) =>
  `(${col(a, "id")}::text = ${p(u)} or exists (select 1 from "dispatcher_team" dt where dt."entregador_id"::text = ${col(a, "id")}::text and dt."dispatcher_id"::text in ${meDispatcherIds(u, p)}))`;
const entregadorDaMinhaEmpresa: Pred = (a, p, u) =>
  `exists (select 1 from "ofertas" o where o."entregador_id"::text = ${col(a, "entregador_id")}::text and o."empresa_id"::text = ${p(u)})`;

const gerenciadoPorMim: Pred = (a, p, u) =>
  `exists (select 1 from "entregadores_gerenciados" g where g."entregador_id"::text = ${col(a, "id")}::text and g."empresa_id"::text = ${p(u)})`;
const naoGerenciadoPorOutra: Pred = (a, p, u) =>
  `not exists (select 1 from "entregadores_gerenciados" g where g."entregador_id"::text = ${col(a, "id")}::text and g."empresa_id"::text <> ${p(u)})`;

const dispatcherMeu = (c: string): Pred => (a, p, u) => `${col(a, c)}::text in ${meDispatcherIds(u, p)}`;

const SENSIVEIS_ENTREGADOR = [
  "cpf", "cnpj", "pix_tipo", "pix_chave", "banco", "selfie_url", "plataforma_comprovante_url",
  "data_nascimento", "cep", "rua", "numero", "complemento", "email", "whatsapp",
];
const SENSIVEIS_EMPRESA = [
  "cnpj", "responsavel", "whatsapp", "plano", "status", "trial_ends_at", "cep", "rua", "numero", "complemento",
  "bairro", "cidade", "estado", "tms_metodo_padrao", "tms_mostrar_margem", "tms_pacotes_por_rota", "tms_valor_padrao_pacote",
];

const apenasEmpresa = (c = "empresa_id") => ({
  read: { empresa: eq(c) } as Rule<Pred>,
  update: { empresa: eq(c) } as Rule<Pred>,
  delete: { empresa: eq(c) } as Rule<Pred>,
  insert: { empresa: ownCol(c) } as Rule<InsertCheck>,
  force: { empresa: { [c]: "uid" } } as Rule<Record<string, "uid">>,
});

export const POLICIES: Record<string, Policy> = {
  profiles: {
    read: { empresa: eq("id"), entregador: eq("id") },
    update: { empresa: eq("id"), entregador: eq("id") },
    insert: { empresa: ownCol("id"), entregador: ownCol("id") },
    force: { empresa: { id: "uid" }, entregador: { id: "uid" } },
  },

  empresas: {
    read: { empresa: eq("id"), entregador: entregadorTrabalhaParaEmpresaInverso() },
    update: { empresa: eq("id") },
    updateCols: {
      empresa: [
        "razao_social", "cnpj", "nome_fantasia", "segmento", "cep", "rua", "numero", "complemento", "bairro",
        "cidade", "estado", "whatsapp", "responsavel", "tms_metodo_padrao", "tms_mostrar_margem",
        "tms_pacotes_por_rota", "tms_valor_padrao_pacote", "updated_at",
      ],
    },
    insert: { empresa: ownCol("id") },
    force: { empresa: { id: "uid" } },
    mask: { entregador: { cols: SENSIVEIS_EMPRESA } },
  },

  entregadores: {
    read: {
      empresa: or(eq("id"), and((a) => `${col(a, "status")} = 'ativo'`, naoGerenciadoPorOutra), entregadorTrabalhaParaEmpresa),
      entregador: eq("id"),
      dispatcher: or(eq("id"), (a) => `${col(a, "status")} = 'ativo'`, entregadorDoMeuTime),
    },
    update: { entregador: eq("id"), empresa: gerenciadoPorMim },
    updateCols: {
      empresa: [
        "nome_completo", "cpf", "whatsapp", "tipo_veiculo", "marca_veiculo", "modelo_veiculo", "placa",
        "pix_tipo", "pix_chave", "banco", "data_nascimento", "cep", "rua", "numero", "complemento", "bairro",
        "cidade", "estado", "email", "tipo_pessoa", "status", "updated_at",
      ],
      entregador: [
        "nome_completo", "cpf", "cnpj", "whatsapp", "tipo_veiculo", "marca_veiculo", "modelo_veiculo", "placa",
        "pix_tipo", "pix_chave", "banco", "data_nascimento", "selfie_url", "plataforma_comprovante_url",
        "cep", "rua", "numero", "complemento", "bairro", "cidade", "estado", "turnos", "plataformas", "bairros",
        "email", "tipo_pessoa", "updated_at",
      ],
    },
    insert: { entregador: ownCol("id") },
    force: { entregador: { id: "uid" } },
    mask: {
      empresa: { cols: SENSIVEIS_ENTREGADOR, unless: or(eq("id"), entregadorTrabalhaParaEmpresa) },
      dispatcher: { cols: SENSIVEIS_ENTREGADOR, unless: entregadorDoMeuTime },
    },
  },

  user_roles: {
    read: { empresa: eq("user_id"), entregador: eq("user_id") },
    insert: {
      empresa: async (row, _uid, run) => {
        if (row.role !== "dispatcher") return "Perfil não permitido";
        const r = await run(`select 1 from "entregadores" where "id" = $1`, [String(row.user_id)]);
        return r.length ? null : "Entregador não encontrado";
      },
    },
  },

  dispatchers: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    update: { empresa: eq("empresa_id") },
    delete: { empresa: eq("empresa_id") },
    insert: { empresa: ownCol("empresa_id") },
    force: { empresa: { empresa_id: "uid" } },
  },

  dispatcher_team: {
    read: { empresa: eq("empresa_id"), entregador: or(dispatcherMeu("dispatcher_id"), eq("entregador_id")) },
    update: { entregador: dispatcherMeu("dispatcher_id") },
    delete: { entregador: dispatcherMeu("dispatcher_id") },
    insert: {
      entregador: async (row, uid, run) => {
        const r = await run(`select 1 from "dispatchers" where "id"::text = $1 and "entregador_id"::text = $2`, [String(row.dispatcher_id), uid]);
        return r.length ? null : "Dispatcher inválido";
      },
    },
  },

  dispatcher_alocacoes: {
    read: { empresa: eq("empresa_id"), entregador: dispatcherMeu("dispatcher_id") },
    update: { empresa: eq("empresa_id"), entregador: dispatcherMeu("dispatcher_id") },
    insert: { empresa: ownCol("empresa_id") },
    force: { empresa: { empresa_id: "uid" } },
  },

  dispatcher_commissions: {
    read: { empresa: eq("empresa_id"), entregador: eq("dispatcher_user_id") },
  },

  ofertas: {
    read: { empresa: eq("empresa_id"), entregador: ofertaVisivelEntregador },
    update: { empresa: eq("empresa_id"), entregador: or(eq("entregador_id"), ofertaAceitavel) },
    updateCols: {
      entregador: [
        "status", "entregador_id", "pacotes_entregues", "pacotes_nao_entregues", "closed_at", "closing_notes", "iniciada_em", "updated_at",
      ],
    },
    updateCheck: {
      entregador: (v, uid) => {
        if (v.entregador_id !== undefined && (v.entregador_id === null || String(v.entregador_id) !== uid))
          return "Não é permitido alterar o entregador da rota";
        if (v.status !== undefined && !["in_progress", "completed"].includes(String(v.status)))
          return "Status não permitido";
        return null;
      },
    },
    delete: { empresa: eq("empresa_id") },
    insert: {
      empresa: ownCol("empresa_id"),
      entregador: async (row, uid, run) => {
        const r = await run(
          `select 1 from "dispatchers" where "id"::text = $1 and "entregador_id"::text = $2 and "empresa_id"::text = $3`,
          [String(row.dispatcher_id ?? ""), uid, String(row.empresa_id ?? "")],
        );
        return r.length ? null : "Somente dispatchers podem criar ofertas";
      },
    },
    force: { empresa: { empresa_id: "uid" } },
  },

  ofertas_privadas_config: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    update: { entregador: eq("entregador_id") },
    updateCols: { entregador: ["status", "aceito_em"] },
    insert: {
      empresa: ownCol("empresa_id"),
      entregador: async (row, uid, run) => {
        const r = await run(
          `select 1 from "ofertas" where "id"::text = $1 and "dispatcher_id"::text in (select "id"::text from "dispatchers" where "entregador_id"::text = $2)`,
          [String(row.oferta_id), uid],
        );
        return r.length ? null : "Oferta não pertence ao seu time";
      },
    },
    force: { empresa: { empresa_id: "uid" } },
  },

  entregas_pacotes: {
    read: { empresa: or(ofertaDaEmpresa, operacaoDaEmpresa), entregador: ofertaDoEntregador },
    update: { empresa: or(ofertaDaEmpresa, operacaoDaEmpresa), entregador: ofertaDoEntregador },
    delete: { empresa: or(ofertaDaEmpresa, operacaoDaEmpresa) },
    updateCols: {
      entregador: [
        "status", "assinatura_url", "foto_pod_url", "nome_recebedor", "observacao_entrega", "entregue_em",
        "motivo_nao_entrega", "tentativas", "codigo_pacote", "updated_at",
      ],
    },
    insert: {
      empresa: async (row, uid, run) => {
        if (row.oferta_id) {
          const r = await run(`select 1 from "ofertas" where "id"::text = $1 and "empresa_id"::text = $2`, [String(row.oferta_id), uid]);
          if (r.length) return null;
        }
        if (row.operacao_id) {
          const r = await run(`select 1 from "operacoes" where "id"::text = $1 and "empresa_id"::text = $2`, [String(row.operacao_id), uid]);
          if (r.length) return null;
        }
        return "Pacote não pertence à sua empresa";
      },
      entregador: async (row, uid, run) => {
        if (!row.oferta_id) return "oferta_id obrigatório";
        const r = await run(`select 1 from "ofertas" where "id"::text = $1 and "entregador_id"::text = $2`, [String(row.oferta_id), uid]);
        return r.length ? null : "Oferta não é sua";
      },
    },
  },

  entregas: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    update: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    insert: { empresa: ownCol("empresa_id"), entregador: ownCol("entregador_id") },
    force: { entregador: { entregador_id: "uid" } },
  },

  entregas_ocorrencias: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    insert: {
      entregador: ownCol("entregador_id"),
      empresa: async (row, uid, run) => {
        if (String(row.empresa_id ?? uid) !== uid) return "Valor inválido em empresa_id";
        const r = await run(`select 1 from "entregadores_gerenciados" where "entregador_id" = $1 and "empresa_id" = $2`, [String(row.entregador_id), uid]);
        return r.length ? null : "Só é possível registrar ocorrência em nome de entregadores cadastrados por você";
      },
    },
    force: { entregador: { entregador_id: "uid" }, empresa: { empresa_id: "uid" } },
  },

  entregadores_gerenciados: { read: { empresa: eq("empresa_id") } },

  entregador_documentos: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    delete: { empresa: eq("empresa_id") },
    insert: {
      empresa: async (row, uid, run) => {
        if (String(row.empresa_id ?? uid) !== uid) return "Valor inválido em empresa_id";
        const r = await run(`select 1 from "entregadores_gerenciados" where "entregador_id" = $1 and "empresa_id" = $2`, [String(row.entregador_id), uid]);
        return r.length ? null : "Só é possível anexar documentos de entregadores cadastrados por você";
      },
    },
    force: { empresa: { empresa_id: "uid" } },
  },

  fechamentos_gestor: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    update: { empresa: eq("empresa_id") },
    updateCols: { empresa: ["status", "nota", "conferido_em"] },
  },

  alocacoes: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    update: { empresa: eq("empresa_id") },
    delete: { empresa: eq("empresa_id") },
    insert: { empresa: ownCol("empresa_id") },
    force: { empresa: { empresa_id: "uid" } },
  },

  operacoes: {
    read: {
      empresa: eq("empresa_id"),
      entregador: (a, p, u) =>
        `(exists (select 1 from "ofertas" o where o."operacao_id"::text = ${col(a, "id")}::text and (o."entregador_id"::text = ${p(u)} or o."dispatcher_id"::text in ${meDispatcherIds(u, p)}))
          or exists (select 1 from "dispatcher_alocacoes" da where da."operacao_id"::text = ${col(a, "id")}::text and da."dispatcher_id"::text in ${meDispatcherIds(u, p)}))`,
    },
    update: { empresa: eq("empresa_id") },
    delete: { empresa: eq("empresa_id") },
    insert: { empresa: ownCol("empresa_id") },
    force: { empresa: { empresa_id: "uid" } },
  },

  rotas_operacao: {
    read: { empresa: eq("empresa_id"), entregador: ofertaDoEntregador },
    update: { empresa: eq("empresa_id") },
    delete: { empresa: eq("empresa_id") },
    insert: { empresa: ownCol("empresa_id") },
    force: { empresa: { empresa_id: "uid" } },
  },

  agenda_previsoes: {
    ...apenasEmpresa(),
    read: {
      empresa: eq("empresa_id"),
      entregador: or(
        (a) => `(${col(a, "status")} = 'aberta' and ${col(a, "data_prevista")} >= current_date)`,
        (a, p, u) =>
          `exists (select 1 from "agenda_compromissos" c where c."previsao_id"::text = ${col(a, "id")}::text and c."entregador_id"::text = ${p(u)})`,
      ),
    },
    mask: {
      entregador: {
        cols: ["endereco_coleta"],
        unless: (a, p, u) =>
          `exists (select 1 from "agenda_compromissos" c where c."previsao_id"::text = ${col(a, "id")}::text and c."entregador_id"::text = ${p(u)} and c."status" <> 'cancelado')`,
      },
    },
  },

  config_pagamento: apenasEmpresa(),

  antecipacoes: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    update: {
      empresa: (a, p, u) => `(${col(a, "empresa_id")}::text = ${p(u)} and ${col(a, "status")} in ('solicitada','aprovada','paga'))`,
      entregador: (a, p, u) => `(${col(a, "entregador_id")}::text = ${p(u)} and ${col(a, "status")} = 'solicitada')`,
    },
    updateCols: {
      empresa: ["status", "observacao", "decidida_em", "paga_em", "abatida_em"],
      entregador: ["status"],
    },
    updateCheck: {
      empresa: (v) => (v.status !== undefined && !["aprovada", "recusada", "paga"].includes(String(v.status)) ? "Status inválido" : null),
      entregador: (v) => (v.status !== "cancelada" ? "Status inválido" : null),
    },
    mask: { entregador: { cols: ["percentual"] } },
  },

  ofertas_recusas: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    insert: { empresa: ownCol("empresa_id") },
    force: { empresa: { empresa_id: "uid" } },
  },

  agenda_compromissos: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    delete: { empresa: eq("empresa_id") },
    update: {
      empresa: eq("empresa_id"),
      entregador: (a, p, u) =>
        `(${col(a, "entregador_id")}::text = ${p(u)} and exists (select 1 from "agenda_previsoes" pv where pv."id"::text = ${col(a, "previsao_id")}::text and pv."status" = 'aberta' and pv."data_prevista" >= current_date and pv."permite_cancelamento" = true and (pv."cancelamento_ate" is null or pv."cancelamento_ate" > now())))`,
    },
    updateCols: { empresa: ["pacotes_ajustados", "status", "observacao", "updated_at"], entregador: ["pacotes_comprometidos", "status", "updated_at"] },
    updateCheck: {
      empresa: (v) => (v.status !== undefined && !["comprometido", "confirmado", "cancelado"].includes(String(v.status)) ? "Status inválido" : null),
      entregador: (v) => (v.status !== undefined && !["comprometido", "cancelado"].includes(String(v.status)) ? "Status inválido" : null),
    },
    insert: {
      entregador: async (row, uid, run) => {
        if (row.entregador_id !== undefined && String(row.entregador_id) !== uid) return "Valor inválido em entregador_id";
        const r = await run(
          `select 1 from "agenda_previsoes" where "id"::text = $1 and "empresa_id" = $2 and "status" = 'aberta' and "data_prevista" >= current_date`,
          [String(row.previsao_id), String(row.empresa_id)],
        );
        return r.length ? null : "Previsão indisponível";
      },
    },
    force: { entregador: { entregador_id: "uid" } },
  },
  auditoria_faixas: apenasEmpresa(),
  financeiro_lancamentos: apenasEmpresa(),
  filiais: apenasEmpresa(),

  eventos_agenda: {
    ...apenasEmpresa(),
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
  },

  entregador_localizacao: {
    read: { entregador: eq("entregador_id"), empresa: entregadorDaMinhaEmpresa },
    insert: { entregador: ownCol("entregador_id") },
    force: { entregador: { entregador_id: "uid" } },
  },

  confiabilidade_score: { read: { entregador: eq("entregador_id"), empresa: entregadorDaMinhaEmpresa } },
  confiabilidade_historico: { read: { entregador: eq("entregador_id"), empresa: entregadorDaMinhaEmpresa } },

  pagamentos: {
    read: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    update: { empresa: eq("empresa_id"), entregador: eq("entregador_id") },
    updateCols: { entregador: ["nf_numero", "nf_url"] },
    insert: { empresa: ownCol("empresa_id") },
    force: { empresa: { empresa_id: "uid" } },
  },

  extratos_mensais: { read: { entregador: eq("entregador_id") } },

  plans: { read: { empresa: true, entregador: true } },

  saidas_nex: apenasEmpresa(),
  insucessos_nex: {
    read: { empresa: raw((a, p, u) => `exists (select 1 from "saidas_nex" s where s."id"::text = ${col(a, "saida_id")}::text and s."empresa_id"::text = ${p(u)})`) },
    update: { empresa: raw((a, p, u) => `exists (select 1 from "saidas_nex" s where s."id"::text = ${col(a, "saida_id")}::text and s."empresa_id"::text = ${p(u)})`) },
    insert: {
      empresa: async (row, uid, run) => {
        const r = await run(`select 1 from "saidas_nex" where "id"::text = $1 and "empresa_id"::text = $2`, [String(row.saida_id), uid]);
        return r.length ? null : "Saída não pertence à sua empresa";
      },
    },
  },

  user_notifications: {
    read: { empresa: eq("user_id"), entregador: eq("user_id") },
    update: { empresa: eq("user_id"), entregador: eq("user_id") },
    delete: { empresa: eq("user_id"), entregador: eq("user_id") },
  },

  notificacoes_whatsapp: { insert: { empresa: true, entregador: true } },
  notificacoes_destinatario: { insert: { empresa: true, entregador: true } },
  admin_notifications: { insert: { empresa: true, entregador: true } },
  admin_logs: { insert: { empresa: true, entregador: true } },
};

function entregadorTrabalhaParaEmpresaInverso(): Pred {
  return (a, p, u) =>
    `(exists (select 1 from "ofertas" o where o."empresa_id"::text = ${col(a, "id")}::text and (o."entregador_id"::text = ${p(u)} or o."dispatcher_id"::text in ${meDispatcherIds(u, p)}))
      or exists (select 1 from "dispatchers" d where d."empresa_id"::text = ${col(a, "id")}::text and d."entregador_id"::text = ${p(u)})
      or exists (select 1 from "agenda_compromissos" c where c."empresa_id"::text = ${col(a, "id")}::text and c."entregador_id"::text = ${p(u)} and c."status" <> 'cancelado'))`;
}
