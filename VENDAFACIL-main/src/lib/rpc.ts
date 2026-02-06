'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview Adapter Robusto de Integração RPC (Backend v4.0)
 * 
 * Implementa estratégias de Fallback para Schema Cache (PGRST202)
 * e resolução de ambiguidade de tipos para PostgreSQL.
 */

/**
 * Busca uma venda aberta ou cria uma nova.
 * Assinatura v4.0: p_store_id, p_table_number, p_customer_name
 */
export async function getOpenSaleRpc(
  storeId: string, 
  tableNumber: number, 
  customerName: string | null = null
): Promise<string> {
  const tableInt = Math.floor(tableNumber);
  const finalCustomerName = customerName && customerName.trim() !== '' ? customerName.trim() : null;

  // Tentativa 1: Assinatura Completa (3 params)
  const { data, error } = await supabase.rpc('rpc_get_open_sale', {
    p_store_id: storeId,
    p_table_number: tableInt,
    p_customer_name: finalCustomerName
  });

  if (error) {
    // Fallback para Schema Cache ou Assinatura de 2 parâmetros (Legado/Em atualização)
    if (error.code === 'PGRST202' || error.message.includes('candidate')) {
      console.warn('[RPC_FALLBACK] rpc_get_open_sale tentando 2 parâmetros');
      const fallback = await supabase.rpc('rpc_get_open_sale', {
        p_store_id: storeId,
        p_table_number: tableInt
      } as any);
      
      if (!fallback.error) return fallback.data as string;
      throw new Error(fallback.error.message);
    }
    throw new Error(error.message);
  }

  return data as string;
}

/**
 * Adiciona um item à venda.
 * Resolve ambiguidade de tipo enviando p_quantity como string (coerção p/ numeric).
 */
export async function addItemToSaleRpc(
  saleId: string, 
  productId: string, 
  quantity: number
): Promise<void> {
  const { error } = await supabase.rpc('rpc_add_item_to_sale', {
    p_sale_id: saleId,
    p_product_id: productId,
    p_quantity: String(quantity) as any // Cast forçado para Numeric
  });

  if (error) {
    // Se falhar por cast, tenta como Number purista
    const retry = await supabase.rpc('rpc_add_item_to_sale', {
      p_sale_id: saleId,
      p_product_id: productId,
      p_quantity: Number(quantity)
    });
    if (retry.error) throw new Error(retry.error.message);
  }
}

/**
 * Fecha a venda e gera o faturamento.
 */
export async function closeSaleRpc(
  saleId: string, 
  paymentMethod: string
): Promise<void> {
  const methodMap: Record<string, string> = {
    'Dinheiro': 'cash',
    'Pix QR Code': 'pix',
    'Cartão': 'card',
    'cash': 'cash',
    'pix': 'pix',
    'card': 'card'
  };

  const { error } = await supabase.rpc('rpc_close_sale', {
    p_sale_id: saleId,
    p_payment_method: methodMap[paymentMethod] || 'cash'
  });

  if (error) throw new Error(error.message);
}

/**
 * Conclui um item na produção (KDS/BDS).
 */
export async function markItemDoneRpc(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_mark_item_done', {
    p_item_id: itemId
  });
  if (error) throw new Error(error.message);
}
