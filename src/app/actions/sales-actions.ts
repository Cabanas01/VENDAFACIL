'use server';

/**
 * @fileOverview Server Action para Processamento de Vendas (PDV)
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CartItem } from '@/lib/types';

export async function processSaleAction(cart: CartItem[], paymentMethod: string) {
  const supabase = createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Garantia de Identidade
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('[SERVER_ACTION_AUTH_FAIL]', authError);
    return { success: false, error: 'Sessão inválida. Por favor, saia e entre novamente.' };
  }

  // 2. Localização do Tenant (Store)
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let finalStoreId = store?.id;

  if (!finalStoreId) {
    const { data: member } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
      .maybeSingle();
    finalStoreId = member?.store_id;
  }

  if (!finalStoreId) {
    return { success: false, error: 'Loja não encontrada ou você não tem permissão para vender nela.' };
  }

  const totalCents = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);

  // 3. Inserção da Venda (A Policy RLS "Allow members to insert sales if store active" valida aqui)
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      store_id: finalStoreId,
      total_cents: totalCents,
      payment_method: paymentMethod as any
    })
    .select()
    .single();

  if (saleError) {
    console.error('[SERVER_ACTION_INSERT_SALE_FAIL]', {
      code: saleError.code,
      message: saleError.message,
      hint: saleError.hint
    });

    let friendlyMessage = 'Erro ao processar venda.';
    
    if (saleError.code === '42501') {
      friendlyMessage = 'Acesso Negado: Seu plano pode estar expirado ou você não tem permissão de escrita.';
    } else if (saleError.message.includes('trial_sales_limit')) {
      friendlyMessage = 'Limite de vendas atingido no Plano de Avaliação. Faça o upgrade para continuar.';
    }
    
    return { success: false, error: friendlyMessage, code: saleError.code };
  }

  try {
    // 4. Inserção dos Itens em Lote
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

    // 5. Baixa de Estoque
    for (const item of cart) {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });
    }

    return { success: true, saleId: sale.id };

  } catch (err: any) {
    console.error('[SERVER_ACTION_ITEMS_FAIL] Rollback manual...', err);
    await supabaseAdmin.from('sales').delete().eq('id', sale.id);
    return { success: false, error: 'Falha ao registrar itens. A venda foi cancelada.' };
  }
}
