'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview SERVIÇO CANÔNICO v5.3 (Obrigatório)
 * 
 * Regra de Ouro: Componentes não chamam supabase.rpc() direto.
 * store_id não é passado no payload (resolvido via auth.uid() no backend).
 */

export const ComandaService = {
  /**
   * 1. Abre ou Obtém Comanda Aberta
   * Assinatura: rpc_get_or_create_open_comanda(p_table_number, p_customer_name)
   */
  async getOrCreateComanda(tableNumber: number, customerName?: string | null) {
    const { data, error } = await supabase.rpc('rpc_get_or_create_open_comanda', {
      p_table_number: Number(tableNumber),
      p_customer_name: customerName ?? null,
    });

    if (error) {
      console.error('[RPC_ERROR] getOrCreateComanda:', error);
      throw error;
    }

    return data as string; // Retorna comanda_id
  },

  /**
   * 2. Adiciona Item à Comanda
   * Assinatura: rpc_add_item_to_comanda(p_comanda_id, p_product_id, p_quantity)
   * p_quantity forçado para Number para evitar ambiguidade (numeric vs integer)
   */
  async adicionarItem(comandaId: string, productId: string, quantity: number) {
    if (Number.isNaN(quantity) || quantity <= 0) {
      throw new Error('Quantidade inválida para lançamento.');
    }

    const { error } = await supabase.rpc('rpc_add_item_to_comanda', {
      p_comanda_id: comandaId,
      p_product_id: productId,
      p_quantity: Number(quantity),
    });

    if (error) {
      console.error('[RPC_ERROR] adicionarItem:', error);
      throw error;
    }
  },

  /**
   * 3. Fecha Atendimento e Gera Venda
   * Assinatura: rpc_close_comanda_to_sale(p_comanda_id, p_payment_method)
   */
  async finalizarAtendimento(comandaId: string, paymentMethod: 'dinheiro' | 'pix' | 'cartao') {
    const { error } = await supabase.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comandaId,
      p_payment_method: paymentMethod,
    });

    if (error) {
      console.error('[RPC_ERROR] finalizarAtendimento:', error);
      throw error;
    }
  },

  /**
   * 4. Conclui Item na Produção (KDS/BDS)
   * Assinatura: rpc_mark_order_item_done(p_order_item_id)
   */
  async concluirPreparo(orderItemId: string) {
    const { error } = await supabase.rpc('rpc_mark_order_item_done', {
      p_order_item_id: orderItemId,
    });

    if (error) {
      console.error('[RPC_ERROR] concluirPreparo:', error);
      throw error;
    }
  }
};
