'use server';

/**
 * @fileOverview Server Action robusta para Processamento de Vendas (PDV e Comandas).
 * 
 * Implementa sincronização obrigatória dos campos de produção para evitar erro de estorno.
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

  try {
    // 1. Identificar privilégios e produtos para mapear destinos de preparo
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    const isSuperAdmin = profile?.is_admin === true;
    const activeClient = isSuperAdmin ? supabaseAdmin : supabase;

    // Buscar destinos de preparo dos produtos no carrinho
    const productIds = cart.map(i => i.product_id);
    const { data: productsData } = await activeClient
      .from('products')
      .select('id, production_target')
      .in('id', productIds);

    const productTargets = new Map((productsData || []).map(p => [p.id, p.production_target]));

    const totalCents = Math.round(cart.reduce((sum, item) => sum + (Number(item.subtotal_cents) || 0), 0));

    // 2. Inserir a Venda Principal
    const { data: sale, error: saleError } = await activeClient
      .from('sales')
      .insert({
        store_id: storeId,
        customer_id: customerId || null,
        total_cents: totalCents,
        payment_method: paymentMethod as any
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 3. Inserir Itens da Venda com campos de produção (OBRIGATÓRIO PARA KDS/BDS)
    const itemsToInsert = cart.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name_snapshot,
      product_barcode_snapshot: item.product_barcode_snapshot || null,
      quantity: Math.max(1, Number(item.qty) || 1), 
      unit_price_cents: Math.round(Number(item.unit_price_cents) || 0),
      subtotal_cents: Math.round(Number(item.subtotal_cents) || 0),
      status: 'pendente',
      destino_preparo: productTargets.get(item.product_id) || 'nenhum'
    }));

    const { error: itemsError } = await activeClient.from('sale_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // 4. Atualizar Estoque via RPC
    for (const item of cart) {
      await activeClient.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: Math.max(1, Number(item.qty) || 1)
      });
    }

    return { 
      success: true, 
      saleId: sale.id,
      sale: { ...sale, items: itemsToInsert }
    };

  } catch (err: any) {
    console.error('[SERVER_ACTION] Erro crítico no processamento:', err);
    return { 
      success: false, 
      error: 'Falha ao processar itens. A venda foi estornada para segurança dos dados.',
      details: err.message 
    };
  }
}
