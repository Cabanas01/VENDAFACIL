'use server';

/**
 * @fileOverview Server Action definitiva para Processamento de Vendas (PDV).
 * 
 * Retorna o objeto completo da venda para permitir impressão imediata no frontend.
 * Adicionado suporte a customer_id para vínculo com comandas e CRM.
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('[SERVER_ACTION] Falha de Identidade:', authError);
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  if (!storeId) {
    return { success: false, error: 'Contexto de loja inválido.' };
  }

  const totalCents = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);

  // Inserção da venda (RLS validará store_id + store_access + auth.uid)
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      store_id: storeId,
      customer_id: customerId || null,
      total_cents: totalCents,
      payment_method: paymentMethod as any
    })
    .select()
    .single();

  if (saleError) {
    console.error('[SERVER_ACTION] Erro ao criar venda:', {
      code: saleError.code,
      message: saleError.message,
      storeId,
      userId: user.id
    });

    let friendlyMessage = 'Erro de permissão: Verifique se seu plano está ativo.';
    
    if (saleError.message.includes('trial_sales_limit')) {
      friendlyMessage = 'Limite de vendas atingido no Plano de Avaliação.';
    } else if (saleError.code === '42501') {
      friendlyMessage = 'Acesso Negado: Sua loja pode estar com o plano expirado ou você não tem permissão nesta unidade.';
    }
    
    return { success: false, error: friendlyMessage, code: saleError.code };
  }

  try {
    const itemsToInsert = cart.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name_snapshot,
      product_barcode_snapshot: item.product_barcode_snapshot || null,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      subtotal_cents: item.subtotal_cents
    }));

    const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // Baixa de estoque via RPC
    for (const item of cart) {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });
    }

    return { 
      success: true, 
      saleId: sale.id,
      sale: { ...sale, items: itemsToInsert }
    };

  } catch (err: any) {
    console.error('[SERVER_ACTION] Erro na transação de itens:', err);
    // Rollback manual do registro da venda em caso de falha nos itens
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from('sales').delete().eq('id', sale.id);
    return { success: false, error: 'Erro ao processar itens da venda. Estorno realizado.' };
  }
}
