'use server';

/**
 * @fileOverview Ações administrativas seguras (Server-Side).
 * 
 * Garante que operações críticas sejam validadas no servidor antes da execução.
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
 * Valida o status de administrador no servidor via RPC de bootstrap.
 */
export async function grantPlanAction(payload: GrantPlanPayload) {
  const supabase = await createSupabaseServerClient();

  // 1. Verificação de Segurança no Servidor (Usando a RPC de bootstrap que é garantida)
  const { data: status, error: bootstrapErr } = await supabase.rpc('get_user_bootstrap_status');

  if (bootstrapErr || !status || !(status as any).is_admin) {
    console.error('[ADMIN_ACTION_DENIED]', { bootstrapErr, status });
    return { 
      success: false, 
      error: 'not admin' 
    };
  }

  // 2. Execução da Concessão
  const { error: grantErr } = await supabase.rpc('admin_grant_store_access', {
    p_store_id: payload.storeId,
    p_plano_tipo: payload.planoTipo,
    p_duracao_dias: payload.duracaoDias,
    p_origem: 'manual_admin',
    p_renovavel: true
  });

  if (grantErr) {
    console.error('[ADMIN_GRANT_ERROR]', grantErr);
    // Se o erro vier do banco como "not admin", repassamos para a UI tratar
    return { success: false, error: grantErr.message === 'not admin' ? 'not admin' : grantErr.message };
  }

  // 3. Limpeza de Cache para refletir mudanças na UI
  revalidatePath('/admin/stores');
  revalidatePath(`/admin/stores/${payload.storeId}`);

  return { success: true };
}
