
'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview Serviços de Integração RPC (Backend v4.0)
 * Centraliza as chamadas transacionais para garantir sincronia com o PostgreSQL.
 * O frontend NUNCA calcula totais ou preços.
 */

/**
 * Busca uma venda aberta ou cria uma nova.
 * Assinatura: rpc_get_open_sale(p_store_id, p_table_number, p_customer_name)
 */
export async function getOpenSaleRpc(
  storeId: string, 
  tableNumber: number, 
  customerName: string = 'Consumidor'
): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_get_open_sale', {
    p_store_id: storeId,
    p_table_number: Math.floor(tableNumber),
    p_customer_name: customerName
  });

  if (error) {
    console.error('[RPC_GET_OPEN_SALE_ERROR]', error);
    throw new Error(error.message || 'Falha ao consultar mesa ativa.');
  }

  return data as string;
}

/**
 * Adiciona um item à venda. O banco resolve preço e subtotal.
 * Assinatura: rpc_add_item_to_sale(p_sale_id, p_product_id, p_quantity)
 */
export async function addItemToSaleRpc(
  saleId: string, 
  productId: string, 
  quantity: number
): Promise<void> {
  const { error } = await supabase.rpc('rpc_add_item_to_sale', {
    p_sale_id: saleId,
    p_product_id: productId,
    p_quantity: Number(quantity) // Garantir tipo numeric
  });

  if (error) {
    console.error('[RPC_ADD_ITEM_ERROR]', error);
    throw new Error(error.message || 'Falha ao lançar item no pedido.');
  }
}

/**
 * Fecha a venda e gera o faturamento.
 * Assinatura: fechar_comanda(p_comanda_id, p_forma_pagamento)
 */
export async function closeSaleRpc(
  saleId: string, 
  paymentMethod: 'cash' | 'pix' | 'card' | string
): Promise<any> {
  const { data, error } = await supabase.rpc('fechar_comanda', {
    p_comanda_id: saleId,
    p_forma_pagamento: paymentMethod
  });

  if (error) {
    console.error('[RPC_FECHAR_COMANDA_ERROR]', error);
    throw new Error(error.message || 'Falha ao finalizar faturamento.');
  }

  return data;
}
