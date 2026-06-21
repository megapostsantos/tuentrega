import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export const getTrackingByToken = createServerFn({ method: 'GET' })
  .inputValidator((data) => z.object({ token: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: pacote, error } = await supabaseAdmin
      .from('entregas_pacotes')
      .select(
        'id, numero_pacote, status, endereco_entrega, lat, lng, foto_pod_url, entregue_em, motivo_nao_entrega, created_at, updated_at, oferta_id'
      )
      .eq('token_rastreamento', data.token)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!pacote) return null;

    // Fetch related oferta dates for richer timeline (non-sensitive only)
    const { data: oferta } = await supabaseAdmin
      .from('ofertas')
      .select('data_trabalho, hora_inicio, status')
      .eq('id', pacote.oferta_id)
      .maybeSingle();

    return {
      pacote: {
        id: pacote.id,
        numero_pacote: pacote.numero_pacote,
        status: pacote.status,
        endereco_entrega: pacote.endereco_entrega,
        lat: pacote.lat,
        lng: pacote.lng,
        foto_pod_url: pacote.foto_pod_url,
        entregue_em: pacote.entregue_em,
        motivo_nao_entrega: pacote.motivo_nao_entrega,
        created_at: pacote.created_at,
        updated_at: pacote.updated_at,
      },
      oferta: oferta ?? null,
    };
  });
