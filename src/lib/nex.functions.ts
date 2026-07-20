import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const inviteMotoristaNex = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ email: z.string().email().max(200) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // Only admin or empresa may invite
    const { data: roles } = await context.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', context.userId);
    const allowed = (roles ?? []).some(
      (r: { role: string }) => r.role === 'admin' || r.role === 'empresa',
    );
    if (!allowed) throw new Error('Não autorizado');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
