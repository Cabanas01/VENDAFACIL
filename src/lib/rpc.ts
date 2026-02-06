'use client';

import { supabase } from './supabase/client';

/**
 * Utilitários centrais para chamadas RPC do VendaFácil Brasil.
 * Sincronizado com o Backend v4.0 (Check Constraints e Parametrizagem p_).
 */

/**
 * Busca uma venda aberta para a mesa ou cria uma nova se não existir.
 * @param p_store_id ID da Loja
 * @param p_table_number Número da Mesa (0 para balcão)
 * @returns UUID da Venda (sale_id)
 */
export async function getOpenSaleRpc(storeId: string, tableNumber: number): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_get_open_sale', {
    p_store_id: storeId,
    p_table_number: Math.floor(tableNumber)
  });

  if (error) {
    console.error('[RPC_GET_OPEN_SALE_ERROR]', error);
    throw new Error(error.message || 'Falha ao consultar ou iniciar atendimento.');
  }

  return data as string;
}

/**
 * Adiciona um item à venda. O banco resolve preço e subtotal.
 */
export async function addItemToSaleRpc(saleId: string, productId: string, quantity: number): Promise<void> {
  const { error } = await supabase.rpc('rpc_add_item_to_sale', {
    p_sale_id: saleId,
    p_product_id: productId,
    p_quantity: quantity
  });

  if (error) {
    console.error('[RPC_ADD_ITEM_ERROR]', error);
    throw new Error(error.message || 'Falha ao lançar item no pedido.');
  }
}

/**
 * Fecha a venda calculando totais e atualizando status para 'closed'.
 */
export async function closeSaleRpc(saleId: string, paymentMethod: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_close_sale', {
    p_sale_id: saleId,
    p_payment_method: paymentMethod
  });

  if (error) {
    console.error('[RPC_CLOSE_SALE_ERROR]', error);
    throw new Error(error.message || 'Falha ao finalizar venda no servidor.');
  }
}

/**
 * Conclui o preparo de um item individual (KDS/BDS).
 */
export async function markItemDoneRpc(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_mark_item_done', {
    p_item_id: itemId
  });

  if (error) {
    console.error('[RPC_MARK_ITEM_DONE_ERROR]', error);
    throw new Error(error.message || 'Falha ao concluir preparo do item.');
  }
}
