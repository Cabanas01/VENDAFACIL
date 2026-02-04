'use server';

/**
 * @fileOverview Server Action definitiva para Processamento de Vendas (PDV).
 * 
 * Implementa bypass de RLS para Super Admins e tratamento de erros de cache de esquema (PGRST204).
 * Adicionado: Lógica de Fallback para garantir a venda mesmo com cache de esquema desatualizado.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CartItem } from '@/lib/types';

export async function processSaleAction(
  storeId: string, 
  cart: CartItem[], 
  paymentMethod: string,
  customerId?: string | null
) {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  if (!storeId) {
    return { success: false, error: 'Contexto de loja inválido.' };
  }

  // Verificar se o usuário é um administrador global
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  
  const isSuperAdmin = profile?.is_admin === true;
  const activeClient = isSuperAdmin ? supabaseAdmin : supabase;

  const totalCents = cart.reduce((sum, item) => sum + (item.subtotal_cents || 0), 0);

  // 1. Inserir a Venda (Tentativa com Payload Completo)
  const insertPayload: any = {
    store_id: storeId,
    customer_id: customerId || null,
    total_cents: totalCents,
    payment_method: paymentMethod as any
  };

  let { data: sale, error: saleError } = await activeClient
    .from('sales')
    .insert(insertPayload)
    .select()
    .single();

  // FALLBACK ESTRATÉGICO: Se falhar por cache de esquema (coluna customer_id desconhecida)
  if (saleError && (saleError.code === 'PGRST204' || saleError.message.includes('customer_id'))) {
    console.warn(`[SERVER_ACTION] Fallback ativado para Loja ${storeId}: API desatualizada (PGRST204). Ignorando customer_id.`);
    
    // Tenta novamente sem a coluna customer_id
    const { customer_id, ...fallbackPayload } = insertPayload;
    const retry = await activeClient
      .from('sales')
      .insert(fallbackPayload)
      .select()
      .single();
    
    sale = retry.data;
    saleError = retry.error;
  }

  if (saleError) {
    console.error('[SERVER_ACTION] Erro fatal ao criar venda:', saleError);
    let friendlyMessage = 'Erro ao processar venda no servidor.';
    if (saleError.message.includes('trial_sales_limit')) friendlyMessage = 'Limite de vendas atingido no Plano de Avaliação.';
    if (saleError.code === '42501') friendlyMessage = 'Acesso Negado: Verifique seu plano ou permissões.';
    
    return { success: false, error: friendlyMessage, code: saleError.code };
  }

  try {
    // 2. Inserir Itens da Venda
    const itemsToInsert = cart.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name_snapshot,
      product_barcode_snapshot: item.product_barcode_snapshot || null,
      quantity: item.qty || 1, 
      unit_price_cents: item.unit_price_cents,
      subtotal_cents: item.subtotal_cents
    }));

    const { error: itemsError } = await activeClient.from('sale_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // 3. Atualizar Estoque via RPC
    for (const item of cart) {
      await activeClient.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.qty || 1
      });
    }

    return { 
      success: true, 
      saleId: sale.id,
      sale: { ...sale, items: itemsToInsert }
    };

  } catch (err: any) {
    console.error('[SERVER_ACTION] Erro na transação de itens:', err);
    await supabaseAdmin.from('sales').delete().eq('id', sale.id);
    return { success: false, error: 'Falha ao processar itens. A venda foi estornada para segurança dos dados.' };
  }
}
