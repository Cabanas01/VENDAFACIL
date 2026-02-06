'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview Serviços de Integração RPC (Backend v4.0)
 * Concentra as chamadas transacionais para garantir sincronia com o PostgreSQL.
 */

/**
 * Busca uma venda aberta para a mesa ou cria uma nova se não existir.
 * @param p_store_id ID da Loja (UUID)
 * @param p_table_number Número da Mesa (Integer)
 * @param p_customer_name Nome do Cliente (Text) - OBRIGATÓRIO v4.0
 */
export async function getOpenSaleRpc(
  storeId: string, 
  tableNumber: number, 
  customerName: string
): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_get_open_sale', {
    p_store_id: storeId,
    p_table_number: Math.floor(tableNumber),
    p_customer_name: customerName
  });

  if (error) {
    console.error('[RPC_GET_OPEN_SALE_ERROR]', error);
    // Erro de assinatura (falta de parâmetro ou tipo errado)
    if (error.message.includes('function') || error.message.includes('candidate')) {
      throw new Error('Erro crítico: Assinatura da função de abertura inválida ou desatualizada.');
    }
    throw new Error('Falha ao abrir atendimento. Verifique os dados e tente novamente.');
  }

  return data as string;
}

/**
 * Adiciona um item à venda. O banco resolve preço, subtotal e status.
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
 * Fecha a venda calculando totais, atualizando caixa e status.
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
