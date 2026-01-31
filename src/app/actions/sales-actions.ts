
'use server';

/**
 * @fileOverview Server Action para Processamento de Vendas (PDV)
 * 
 * Centraliza a transação no servidor para garantir que o auth.uid() seja propagado.
 * Recebe o storeId explicitamente para evitar falhas de RLS.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CartItem } from '@/lib/types';

export async function processSaleAction(storeId: string, cart: CartItem[], paymentMethod: string) {
  const supabase = createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Garantia de Identidade no Servidor
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('[SERVER_ACTION_AUTH_FAIL]', authError);
    return { success: false, error: 'Sessão expirada. Por favor, saia e entre novamente.' };
  }

  if (!storeId) {
    return { success: false, error: 'ID da loja não fornecido. Operação abortada.' };
  }

  const totalCents = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);

  console.log('[SALE_PROCESING]', {
    store_id: storeId,
    user_id: user.id,
    items_count: cart.length,
    total: totalCents
  });

  // 2. Inserção da Venda (Validada pelas Policies de Member + Active Access)
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      store_id: storeId,
      total_cents: totalCents,
      payment_method: paymentMethod as any
    })
    .select()
    .single();

  if (saleError) {
    console.error('[SERVER_ACTION_INSERT_SALE_FAIL]', {
      code: saleError.code,
      message: saleError.message,
      payload: { store_id: storeId, total_cents: totalCents }
    });

    let friendlyMessage = 'Acesso Negado: Verifique se sua loja possui um plano ativo.';
    
    // Tratamento específico para triggers de limite do banco
    if (saleError.message.includes('trial_sales_limit')) {
      friendlyMessage = 'Limite de 5 vendas atingido no Plano de Avaliação. Faça o upgrade para continuar.';
    } else if (saleError.code === '42501') {
      friendlyMessage = 'Permissão negada. Sua identidade não foi reconhecida ou o plano expirou.';
    }
    
    return { success: false, error: friendlyMessage, code: saleError.code };
  }

  try {
    // 3. Inserção dos Itens (Batch)
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

    // 4. Baixa de Estoque via RPC
    for (const item of cart) {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });
    }

    return { success: true, saleId: sale.id };

  } catch (err: any) {
    console.error('[SERVER_ACTION_ITEMS_FAIL] Executando rollback manual...', err);
    // Remove a venda "pai" se os itens falharem para manter integridade
    await supabaseAdmin.from('sales').delete().eq('id', sale.id);
    return { success: false, error: 'Falha ao registrar itens da venda. Operação cancelada.' };
  }
}
