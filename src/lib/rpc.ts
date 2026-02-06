'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview Adapter Robusto COMANDA-FIRST (Backend v5.0)
 * 
 * Centraliza as únicas 4 mutações financeiras permitidas no sistema.
 */

/**
 * 1. Abre ou Obtém Comanda Ativa.
 * Mesa 0 = PDV Balcão.
 */
export async function getOrCreateOpenComandaRpc(
  storeId: string, 
  tableNumber: number, 
  customerName: string | null = null
): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_get_or_create_open_comanda', {
    p_store_id: storeId,
    p_table_number: Math.floor(tableNumber),
    p_customer_name: customerName || null
  });

  if (error) {
    console.error('[RPC_ERROR] rpc_get_or_create_open_comanda:', error);
    throw new Error(error.message);
  }

  return data as string;
}

/**
 * 2. Adiciona Item à Comanda.
 * p_quantity é forçado para numeric (Number) para evitar erro de overload.
 */
export async function addItemToComandaRpc(
  comandaId: string, 
  productId: string, 
  quantity: number
): Promise<void> {
  const { error } = await supabase.rpc('rpc_add_item_to_comanda', {
    p_comanda_id: comandaId,
    p_product_id: productId,
    p_quantity: Number(quantity) // Força Numeric
  });

  if (error) {
    console.error('[RPC_ERROR] rpc_add_item_to_comanda:', error);
    throw new Error(error.message);
  }
}

/**
 * 3. Fecha Comanda e Gera Venda (Atômico).
 */
export async function closeComandaToSaleRpc(
  comandaId: string, 
  paymentMethod: 'cash' | 'pix' | 'card'
): Promise<void> {
  const { error } = await supabase.rpc('rpc_close_comanda_to_sale', {
    p_comanda_id: comandaId,
    p_payment_method: paymentMethod
  });

  if (error) {
    console.error('[RPC_ERROR] rpc_close_comanda_to_sale:', error);
    throw new Error(error.message);
  }
}

/**
 * 4. Conclui Item de Produção (KDS/BDS).
 */
export async function markOrderItemDoneRpc(orderItemId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_mark_order_item_done', {
    p_order_item_id: orderItemId
  });

  if (error) {
    console.error('[RPC_ERROR] rpc_mark_order_item_done:', error);
    throw new Error(error.message);
  }
}
