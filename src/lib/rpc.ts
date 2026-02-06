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
 * @param p_customer_name Nome do Cliente (Text)
 */
export async function getOpenSaleRpc(
  storeId: string, 
  tableNumber: number, 
  customerName: string | null = 'Consumidor'
): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_get_open_sale', {
    p_store_id: storeId,
    p_table_number: Math.floor(tableNumber),
    p_customer_name: customerName
  });

  if (error) {
    console.error('[RPC_GET_OPEN_SALE_ERROR]', error);
    // Erro amigável para quando a assinatura está errada ou o banco falha
    if (error.code === 'P0001' || error.message.includes('candidate')) {
      throw new Error('Falha crítica na comunicação com o servidor de vendas. Tente novamente.');
    }
    throw new Error(error.message || 'Não foi possível abrir o atendimento.');
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
    p_quantity: Number(quantity) // Garante Numeric para o PostgreSQL
  });

  if (error) {
    console.error('[RPC_ADD_ITEM_ERROR]', error);
    throw new Error(error.message || 'Falha ao lançar item no pedido.');
  }
}

/**
 * Fecha a venda calculando totais e atualizando status via RPC rpc_close_sale.
 * @param p_sale_id ID da Venda (UUID)
 * @param p_payment_method Método de Pagamento (Text)
 */
export async function closeSaleRpc(
  saleId: string, 
  paymentMethod: string
): Promise<void> {
  const { error } = await supabase.rpc('rpc_close_sale', {
    p_sale_id: saleId,
    p_payment_method: paymentMethod
  });

  if (error) {
    console.error('[RPC_CLOSE_SALE_ERROR]', error);
    throw new Error(error.message || 'Falha ao finalizar faturamento.');
  }
}
