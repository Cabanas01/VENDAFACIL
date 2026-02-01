'use server';

/**
 * @fileOverview Ações administrativas seguras (Server-Side).
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type GrantPlanPayload = {
  storeId: string;
  planoTipo: string;
  duracaoDias: number;
};

/**
 * Concede um plano manualmente a uma loja.
 * Valida o status de administrador no servidor de forma robusta.
 */
export async function grantPlanAction(payload: GrantPlanPayload) {
  const supabase = await createSupabaseServerClient();

  // 1. Validar Sessão
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Sessão inválida ou expirada.' };
  }

  // 2. Validar Status de Admin na Tabela de Usuários (Fonte da Verdade)
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    console.error('[ADMIN_ACTION_DENIED]', { userId: user.id, profileError });
    return { success: false, error: 'not admin' };
  }

  // 3. Execução da Concessão via RPC (Security Definer)
  const { error: grantErr } = await supabase.rpc('admin_grant_store_access', {
    p_store_id: payload.storeId,
    p_plano_tipo: payload.planoTipo,
    p_duracao_dias: payload.duracaoDias,
    p_origem: 'manual_admin',
    p_renovavel: true
  });

  if (grantErr) {
    console.error('[ADMIN_GRANT_ERROR]', grantErr);
    return { success: false, error: grantErr.message };
  }

  // 4. Sincronizar Cache
  revalidatePath('/admin/stores');
  revalidatePath(`/admin/stores/${payload.storeId}`);

  return { success: true };
}
