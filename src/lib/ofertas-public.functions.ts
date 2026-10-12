import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/db";
import { ofertas, empresas } from "@/db/schema";
import { eq } from "drizzle-orm";

export const getOfertaPublic = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const [oferta] = await db
      .select()
      .from(ofertas)
      .where(eq(ofertas.id, data.id))
      .limit(1);
    if (!oferta) return null;

    let empresaNome: string | null = null;
    if (oferta.empresaId) {
      const [emp] = await db
        .select({ nomeFantasia: empresas.nomeFantasia, razaoSocial: empresas.razaoSocial })
        .from(empresas)
        .where(eq(empresas.id, oferta.empresaId))
        .limit(1);
      empresaNome = emp?.nomeFantasia || emp?.razaoSocial || null;
    }

    return {
      id: oferta.id,
      titulo: oferta.titulo,
      descricao: oferta.descricao,
      bairro: oferta.bairro,
      valor: oferta.valor,
      valor_por_pacote: oferta.valorPorPacote,
      exige_nota_fiscal: oferta.exigeNotaFiscal,
      status: oferta.status,
      tipo_entrega: oferta.tipoEntrega,
      veiculo_necessario: oferta.veiculoNecessario,
      quantidade_pacotes: oferta.quantidadePacotes,
      endereco_coleta: oferta.enderecoColeta,
      data_trabalho: oferta.dataTrabalho,
      hora_inicio: oferta.horaInicio,
      hora_fim: oferta.horaFim,
      empresa_nome: empresaNome,
    };
  });
