// Funcionário da empresa ("operador"): opera o dia a dia (operação, alocação, rotas, devoluções), sem ver nem digitar valores
// e sem poder apagar nada. Quem decide valores e apaga é o dono da empresa.

/** Tabelas financeiras: o operador não lê nem escreve. */
export const OPERADOR_NEGADAS = new Set([
  "pagamentos", "extratos_mensais", "financeiro_lancamentos", "antecipacoes", "config_pagamento",
  "dispatcher_commissions", "dispatcher_team", "dispatcher_alocacoes", "ofertas_privadas_config",
]);

/** Tabelas que só o dono altera. */
export const OPERADOR_SEM_ESCRITA = new Set(["equipe_empresa", "empresas", "filiais"]);

/** Colunas com valores em dinheiro: voltam nulas e são ignoradas se o operador tentar gravar. */
export const OPERADOR_MASCARAS: Record<string, string[]> = {
  ofertas: ["valor", "valor_por_pacote", "payment_confirmed_by", "payment_notes", "payment_status"],
  entregas: ["valor"],
  operacoes: ["valor_por_pacote", "valor_ml_por_pacote"],
  rotas_operacao: ["valor_total"],
  dispatchers: ["valor_por_pacote"],
  agenda_previsoes: ["valor_por_pacote"],
  eventos_agenda: ["valor"],
  empresas: ["tms_valor_padrao_pacote"],
  entregadores: ["pix_tipo", "pix_chave", "banco"],
};

/** RPCs que só o dono executa. */
export const OPERADOR_RPC_NEGADAS = new Set(["eliminar_rota", "limpar_meus_dados", "cadastrar_membro_equipe", "definir_membro_entregador"]);

export function mascarado(table: string, col: string): boolean {
  return !!OPERADOR_MASCARAS[table]?.includes(col);
}

export function removeMascaradas<T extends Record<string, unknown>>(table: string, row: T): T {
  const cols = OPERADOR_MASCARAS[table];
  if (!cols || !row || typeof row !== "object") return row;
  const out: Record<string, unknown> = { ...row };
  for (const c of cols) if (c in out) out[c] = null;
  return out as T;
}

/** Valores que o operador não digita: saem do valor padrão por pacote definido pelo dono. */
export function preencheFinanceiro(table: string, row: Record<string, unknown>, vp: number): void {
  const cols = OPERADOR_MASCARAS[table];
  if (cols) for (const c of cols) delete row[c];
  const q = Number(row.quantidade_pacotes ?? 0);
  if (table === "operacoes") row.valor_por_pacote = vp;
  else if (table === "rotas_operacao") row.valor_total = Math.round(q * vp * 100) / 100;
  else if (table === "ofertas") {
    row.valor_por_pacote = vp;
    row.valor = Math.round(q * vp * 100) / 100;
  } else if (table === "agenda_previsoes") row.valor_por_pacote = vp;
}
