
'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview SERVIÇO CANÔNICO v5.3 (DEFINITIVO)
 * 
 * Sincronizado com o hint do banco de dados:
 * public.rpc_get_or_create_open_comanda(p_numero, p_store_id)
 */

export const ComandaService = {
  /**
   * 1. Busca ou Cria Comanda Aberta
   * Assinatura Real: rpc_get_or_create_open_comanda(p_numero, p_store_id)
   */
  async getOrCreateComanda(storeId: string, tableNumber: number) {
    const { data, error } = await supabase.rpc('rpc_get_or_create_open_comanda', {
      p_numero: Number(tableNumber),
      p_store_id: storeId,
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_get_or_create_open_comanda:', error);
      throw new Error(error.message || 'Falha ao abrir comanda no servidor.');
    }

    return data as string; // Retorna ID da comanda (UUID)
  },

  /**
   * 2. Adiciona Item à Comanda
   * Assinatura: rpc_add_item_to_comanda(p_comanda_id, p_product_id, p_quantity)
   */
  async adicionarItem(comandaId: string, productId: string, quantity: number) {
    const { error } = await supabase.rpc('rpc_add_item_to_comanda', {
      p_comanda_id: comandaId,
      p_product_id: productId,
      p_quantity: Number(quantity), // Cast obrigatório para numeric
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_add_item_to_comanda:', error);
      throw new Error(error.message || 'Erro ao lançar item no pedido.');
    }
  },

  /**
   * 3. Fecha Atendimento e Gera Venda
   * Assinatura: rpc_close_comanda_to_sale(p_comanda_id, p_payment_method)
   */
  async finalizarAtendimento(comandaId: string, paymentMethod: 'dinheiro' | 'pix' | 'cartao') {
    const { data, error } = await supabase.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comandaId,
      p_payment_method: paymentMethod,
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_close_comanda_to_sale:', error);
      throw new Error(error.message || 'Erro ao processar pagamento.');
    }

    return data;
  },

  /**
   * 4. Conclui Item na Produção
   * Assinatura: rpc_mark_order_item_done(p_order_item_id)
   */
  async concluirPreparo(orderItemId: string) {
    const { error } = await supabase.rpc('rpc_mark_order_item_done', {
      p_order_item_id: orderItemId,
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_mark_order_item_done:', error);
      throw new Error(error.message || 'Falha ao concluir item.');
    }
  }
};
