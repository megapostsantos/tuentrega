import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const inviteSchema = z.object({
  nome_completo: z.string().min(2).max(120),
  email: z.string().email(),
  whatsapp: z.string().max(30).optional().nullable(),
  tipo_veiculo: z.enum(['moto', 'carro', 'bike', 'van', 'a_pe']).optional().nullable(),
  modelo_veiculo: z.string().max(80).optional().nullable(),
  placa: z.string().max(20).optional().nullable(),
  tipo_operacao: z.enum(['nex', 'distribuicao', 'ambos']).default('ambos'),
  redirect_to: z.string().url().optional(),
});

export const inviteEntregador = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Authorize: empresa or admin only
    const { data: isEmpresa } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'empresa',
    });
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (!isEmpresa && !isAdmin) {
      throw new Error('Apenas empresas ou administradores podem cadastrar entregadores.');
    }

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    // 1. Invite user by email (creates auth.users row + sends email)
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: {
          role: 'entregador',
          full_name: data.nome_completo,
        },
        redirectTo: data.redirect_to,
      },
    );

    if (inviteErr || !invited?.user) {
      // If user already exists, try to find them
      if (inviteErr?.message?.toLowerCase().includes('already')) {
        throw new Error('Este email já está cadastrado na plataforma.');
      }
      throw new Error(inviteErr?.message || 'Falha ao enviar convite.');
    }

    const userId = invited.user.id;

    // 2. Upsert entregador record with the extra fields (handle_new_user trigger skips
    //    entregadores insert because cpf is not in metadata)
    const { error: upsertErr } = await supabaseAdmin
      .from('entregadores')
      .upsert(
        {
          id: userId,
          nome_completo: data.nome_completo,
          email: data.email,
          whatsapp: data.whatsapp ?? null,
          tipo_veiculo: (data.tipo_veiculo ?? null) as any,
          modelo_veiculo: data.modelo_veiculo ?? null,
          placa: data.placa ?? null,
          tipo_operacao: data.tipo_operacao,
          invited_at: new Date().toISOString(),
          status: 'ativo',
        },
        { onConflict: 'id' },
      );

    if (upsertErr) {
      throw new Error('Convite enviado, mas falhou ao registrar entregador: ' + upsertErr.message);
    }

    // 3. Ensure entregador role
    await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: 'entregador' as any }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: true,
      });

    return { id: userId, email: data.email, nome_completo: data.nome_completo };
  });
