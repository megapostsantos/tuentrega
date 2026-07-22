import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export const getOfertaPublic = createServerFn({ method: 'GET' })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: oferta, error } = await supabaseAdmin
      .from('ofertas')
      .select(
        'id, titulo, descricao, bairro, valor, valor_por_pacote, exige_nota_fiscal, status, tipo_entrega, veiculo_necessario, quantidade_pacotes, endereco_coleta, data_trabalho, hora_inicio, hora_fim, empresa_id'
      )
      .eq('id', data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!oferta) return null;

    let empresaNome: string | null = null;
    if (oferta.empresa_id) {
      const { data: emp } = await supabaseAdmin
        .from('empresas')
        .select('nome_fantasia, razao_social')
        .eq('id', oferta.empresa_id)
        .maybeSingle();
      empresaNome = emp?.nome_fantasia || emp?.razao_social || null;
    }
    const { empresa_id: _e, ...safe } = oferta;
    return { ...safe, empresa_nome: empresaNome };
  });
