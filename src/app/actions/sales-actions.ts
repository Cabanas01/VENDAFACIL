'use server';

/**
 * @fileOverview Server Action definitiva para Processamento de Vendas (PDV).
 * 
 * Implementa bypass de RLS para Super Admins e tratamento de erros de cache de esquema (PGRST204).
 * Sincronizado para garantir campos obrigatórios de produção (status e destino_preparo).
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

  const totalCents = cart.reduce((sum, item) => sum + (item.subtotal_cents || 0), 0);

  // 2. Inserir a Venda Principal
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

  // Fallback para cache de esquema desatualizado
  if (saleError && (saleError.code === 'PGRST204' || saleError.message.includes('customer_id'))) {
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
    console.error('[SERVER_ACTION] Erro ao criar venda:', saleError);
    return { success: false, error: 'Erro ao processar venda no servidor.', code: saleError.code };
  }

  try {
    // 3. Inserir Itens da Venda com campos de produção
    const itemsToInsert = cart.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name_snapshot,
      product_barcode_snapshot: item.product_barcode_snapshot || null,
      quantity: Number(item.qty) || 1, 
      unit_price_cents: item.unit_price_cents,
      subtotal_cents: item.subtotal_cents,
      status: 'pendente', // Obrigatório para o fluxo de KDS/BDS
      destino_preparo: productTargets.get(item.product_id) || 'nenhum'
    }));

    const { error: itemsError } = await activeClient.from('sale_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // 4. Atualizar Estoque via RPC
    for (const item of cart) {
      await activeClient.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: Number(item.qty) || 1
      });
    }

    return { 
      success: true, 
      saleId: sale.id,
      sale: { ...sale, items: itemsToInsert }
    };

  } catch (err: any) {
    console.error('[SERVER_ACTION] Erro na transação de itens:', err);
    // Estorno manual da venda em caso de falha nos itens
    await supabaseAdmin.from('sales').delete().eq('id', sale.id);
    return { success: false, error: 'Falha ao processar itens. A venda foi estornada para segurança dos dados.' };
  }
}
