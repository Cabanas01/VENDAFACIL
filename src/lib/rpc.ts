
'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview SERVIÇO CANÔNICO v5.4 (AJUSTADO)
 * 
 * Sincronizado com o esquema real do banco para evitar violação de constraints.
 * Status: 'open' | 'closed'
 * Métodos: 'cash' | 'pix' | 'card'
 */

export const ComandaService = {
  /**
   * 1. Busca ou Cria Comanda Aberta
   * Assinatura Real detectada: rpc_get_or_create_open_comanda(p_numero, p_store_id)
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
      p_quantity: Number(quantity),
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_add_item_to_comanda:', error);
      throw new Error(error.message || 'Erro ao lançar item no pedido.');
    }
  },

  /**
   * 3. Fecha Atendimento e Gera Venda
   * Mapeamento de métodos para satisfazer check constraints: cash, pix, card
   */
  async finalizarAtendimento(comandaId: string, method: 'cash' | 'pix' | 'card') {
    const { data, error } = await supabase.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comandaId,
      p_payment_method: method,
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_close_comanda_to_sale:', error);
      throw new Error(error.message || 'Erro ao processar pagamento.');
    }

    return data;
  },

  /**
   * 4. Conclui Item na Produção
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
