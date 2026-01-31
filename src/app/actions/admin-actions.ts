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
 * Valida o status de administrador no servidor via RPC.
 */
export async function grantPlanAction(payload: GrantPlanPayload) {
  const supabase = createSupabaseServerClient();

  // 1. Verificação de Segurança no Servidor
  const { data: isAdmin, error: adminErr } = await supabase.rpc('get_admin_status');

  if (adminErr || !isAdmin) {
    console.error('[ADMIN_ACTION_DENIED]', { adminErr, isAdmin });
    return { 
      success: false, 
      error: 'Acesso negado: Sua identidade de administrador não foi confirmada pelo servidor.' 
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
    return { success: false, error: grantErr.message };
  }

  // 3. Limpeza de Cache para refletir mudanças na UI
  revalidatePath('/admin/stores');
  revalidatePath(`/admin/stores/${payload.storeId}`);

  return { success: true };
}
