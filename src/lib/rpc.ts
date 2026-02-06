'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview Serviços de Integração RPC (Backend v4.0)
 * Centraliza as chamadas transacionais para garantir sincronia com o PostgreSQL.
 */

/**
 * Busca uma venda aberta para a mesa ou cria uma nova se não existir.
 * @param p_store_id ID da Loja (UUID)
 * @param p_table_number Número da Mesa (Integer)
 * @param p_customer_name Nome do Cliente (Text) - Opcional
 */
export async function getOpenSaleRpc(
  storeId: string, 
  tableNumber: number, 
  customerName: string | null = null
): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_get_open_sale', {
    p_store_id: storeId,
    p_table_number: Math.floor(tableNumber),
    p_customer_name: customerName
  });

  if (error) {
    console.error('[RPC_GET_OPEN_SALE_ERROR]', error);
    throw new Error('Falha ao abrir atendimento no servidor.');
  }

  return data as string;
}

/**
 * Adiciona um item à venda. O banco resolve preço, subtotal e status.
 * @param p_sale_id ID da Venda (UUID)
 * @param p_product_id ID do Produto (UUID)
 * @param p_quantity Quantidade (Numeric)
 */
export async function addItemToSaleRpc(
  saleId: string, 
  productId: string, 
  quantity: number
): Promise<void> {
  const { error } = await supabase.rpc('rpc_add_item_to_sale', {
    p_sale_id: saleId,
    p_product_id: productId,
    p_quantity: Number(quantity) // Garante Numeric
  });

  if (error) {
    console.error('[RPC_ADD_ITEM_ERROR]', error);
    throw new Error(error.message || 'Falha ao lançar item no pedido.');
  }
}

/**
 * Fecha a comanda calculando totais, atualizando caixa e status via RPC fechar_comanda.
 * @param p_comanda_id ID da Venda/Comanda (UUID)
 * @param p_forma_pagamento Método de Pagamento (Text)
 */
export async function fecharComandaRpc(
  comandaId: string, 
  formaPagamento: string
): Promise<any> {
  const { data, error } = await supabase.rpc('fechar_comanda', {
    p_comanda_id: comandaId,
    p_forma_pagamento: formaPagamento
  });

  if (error) {
    console.error('[RPC_CLOSE_COMANDA_ERROR]', error);
    throw new Error(error.message || 'Falha ao finalizar venda no servidor.');
  }

  return data;
}
