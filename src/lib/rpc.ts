'use client';

import { supabase } from './supabase/client';

/**
 * Utilitários centrais para chamadas RPC do VendaFácil Brasil.
 * Garante que os parâmetros sigam rigorosamente o contrato do backend (prefixo p_).
 */

export async function getOpenSaleRpc(storeId: string, tableNumber: number): Promise<string | null> {
  const { data, error } = await supabase.rpc('rpc_get_open_sale', {
    p_store_id: storeId,
    p_table_number: Math.floor(tableNumber)
  });

  if (error) {
    console.error('[RPC_GET_OPEN_SALE_ERROR]', error);
    throw new Error('Falha ao consultar mesa ativa.');
  }

  return data as string | null;
}

export async function openSaleRpc(storeId: string, tableNumber: number, customerName: string): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_open_sale', {
    p_store_id: storeId,
    p_table_number: Math.floor(tableNumber),
    p_customer_name: customerName || 'Cliente'
  });

  if (error) {
    console.error('[RPC_OPEN_SALE_ERROR]', error);
    throw new Error('Falha ao abrir novo atendimento.');
  }

  return data as string;
}

export async function addItemToSaleRpc(saleId: string, productId: string, quantity: number, destino: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_add_item_to_sale', {
    p_sale_id: saleId,
    p_product_id: productId,
    p_quantity: quantity,
    p_destino_preparo: destino || 'nenhum'
  });

  if (error) {
    console.error('[RPC_ADD_ITEM_ERROR]', error);
    throw new Error('Falha ao lançar item no pedido.');
  }
}

export async function closeSaleRpc(saleId: string, paymentMethod: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_close_sale', {
    p_sale_id: saleId,
    p_payment_method: paymentMethod
  });

  if (error) {
    console.error('[RPC_CLOSE_SALE_ERROR]', error);
    throw new Error('Falha ao finalizar venda.');
  }
}

export async function markItemDoneRpc(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_mark_item_done', {
    p_item_id: itemId
  });

  if (error) {
    console.error('[RPC_MARK_ITEM_DONE_ERROR]', error);
    throw new Error('Falha ao concluir preparo.');
  }
}
