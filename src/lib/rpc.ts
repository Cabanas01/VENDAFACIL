'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview SERVIÇO CANÔNICO v5.3 (OFICIAL)
 * 
 * Central de mutações transacionais. 
 * Ajustado para a assinatura real detectada: (p_numero, p_store_id)
 */

export const ComandaService = {
  /**
   * 1. Abre ou Recupera Comanda Aberta (PDV = Mesa 0)
   * Assinatura real: p_numero (int), p_store_id (uuid)
   */
  async getOrCreateComanda(tableNumber: number, storeId: string) {
    const { data, error } = await supabase.rpc('rpc_get_or_create_open_comanda', {
      p_numero: Number(tableNumber),
      p_store_id: storeId
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_get_or_create_open_comanda:', error);
      throw new Error(error.message);
    }

    return data as string; // Retorna comanda_id
  },

  /**
   * 2. Adiciona Item à Comanda
   * Assinatura: p_comanda_id (uuid), p_product_id (uuid), p_quantity (numeric)
   */
  async adicionarItem(comandaId: string, productId: string, quantity: number) {
    const { error } = await supabase.rpc('rpc_add_item_to_comanda', {
      p_comanda_id: comandaId,
      p_product_id: productId,
      p_quantity: Number(quantity)
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_add_item_to_comanda:', error);
      throw new Error(error.message);
    }
  },

  /**
   * 3. Fecha Comanda e Gera Venda (Atômico)
   * Assinatura: p_comanda_id (uuid), p_payment_method (text)
   */
  async finalizarAtendimento(comandaId: string, paymentMethod: 'cash' | 'pix' | 'card') {
    const { error } = await supabase.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comandaId,
      p_payment_method: paymentMethod
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_close_comanda_to_sale:', error);
      throw new Error(error.message);
    }
  },

  /**
   * 4. Conclui Item na Produção (KDS/BDS)
   * Assinatura: p_order_item_id (uuid)
   */
  async concluirPreparo(orderItemId: string) {
    const { error } = await supabase.rpc('rpc_mark_order_item_done', {
      p_order_item_id: orderItemId
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_mark_order_item_done:', error);
      throw new Error(error.message);
    }
  }
};
