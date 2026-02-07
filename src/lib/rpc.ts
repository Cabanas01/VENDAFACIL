
'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview SERVIÇO CANÔNICO v6.1
 * 
 * Central de mutações transacionais alinhada ao Schema Cache real.
 */

export const ComandaService = {
  /**
   * 1. Abre ou Recupera Venda Aberta
   * Assinatura detectada: p_numero (int), p_store_id (uuid)
   */
  async getOrCreateSale(storeId: string, tableNumber: number) {
    const { data, error } = await supabase.rpc('rpc_get_or_create_open_comanda', {
      p_numero: Number(tableNumber),
      p_store_id: storeId
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_get_or_create_open_comanda:', error);
      throw new Error(error.message);
    }

    return data as string; // Retorna comanda_id/sale_id
  },

  /**
   * 2. Adiciona Item à Venda
   */
  async adicionarItem(payload: {
    saleId: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    destino: 'cozinha' | 'bar' | 'nenhum';
  }) {
    const { error } = await supabase.rpc('rpc_add_item_to_sale', {
      p_sale_id: payload.saleId,
      p_product_id: payload.productId,
      p_product_name: payload.productName,
      p_quantity: Number(payload.quantity),
      p_price: Number(payload.price),
      p_destino: payload.destino
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_add_item_to_sale:', error);
      throw new Error(error.message);
    }
  },

  /**
   * 3. Fecha Venda
   */
  async finalizarVenda(saleId: string, paymentMethod: 'cash' | 'pix' | 'card') {
    const { error } = await supabase.rpc('rpc_close_sale', {
      p_sale: saleId,
      p_payment: paymentMethod
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_close_sale:', error);
      throw new Error(error.message);
    }
  },

  /**
   * 4. Conclui Item
   */
  async concluirItem(saleItemId: string) {
    const { error } = await supabase.rpc('rpc_mark_item_done', {
      p_item: saleItemId
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_mark_item_done:', error);
      throw new Error(error.message);
    }
  }
};
