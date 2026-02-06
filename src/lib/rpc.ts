'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview SERVIÇO CANÔNICO v5.3 (DEFINITIVO)
 * 
 * Regras de Ouro aplicadas:
 * 1. Nomes literais para RPC (ex: 'rpc_get_or_create_open_comanda').
 * 2. store_id removido (resolvido via auth.uid() no backend).
 * 3. p_quantity sempre passa por Number() para garantir numeric no Postgres.
 * 4. Nenhuma chamada REST (.insert/.update) permitida para tabelas financeiras.
 */

export const ComandaService = {
  /**
   * 1. Busca ou Cria Comanda Aberta (Literal)
   * Assinatura: rpc_get_or_create_open_comanda(p_table_number, p_customer_name)
   */
  async getOrCreateComanda(tableNumber: number, customerName?: string | null) {
    const { data, error } = await supabase.rpc('rpc_get_or_create_open_comanda', {
      p_table_number: Number(tableNumber),
      p_customer_name: customerName && customerName.trim() !== '' ? customerName.trim() : null,
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_get_or_create_open_comanda:', error);
      throw new Error(error.message || 'Falha ao abrir comanda. Verifique o schema cache.');
    }

    return data as string; // Retorna comanda_id (UUID)
  },

  /**
   * 2. Adiciona Item à Comanda (Literal)
   * Assinatura: rpc_add_item_to_comanda(p_comanda_id, p_product_id, p_quantity)
   */
  async adicionarItem(comandaId: string, productId: string, quantity: number) {
    if (Number.isNaN(quantity) || quantity <= 0) {
      throw new Error('Quantidade inválida para lançamento.');
    }

    const { error } = await supabase.rpc('rpc_add_item_to_comanda', {
      p_comanda_id: comandaId,
      p_product_id: productId,
      p_quantity: Number(quantity), // 🚨 Cast obrigatório para numeric
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_add_item_to_comanda:', error);
      throw new Error(error.message || 'Falha ao lançar item no pedido.');
    }
  },

  /**
   * 3. Fecha Atendimento e Gera Venda (Literal)
   * Assinatura: rpc_close_comanda_to_sale(p_comanda_id, p_payment_method)
   */
  async finalizarAtendimento(comandaId: string, paymentMethod: 'dinheiro' | 'pix' | 'cartao') {
    const { data, error } = await supabase.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comandaId,
      p_payment_method: paymentMethod,
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_close_comanda_to_sale:', error);
      throw new Error(error.message || 'Erro ao processar fechamento e pagamento.');
    }

    return data;
  },

  /**
   * 4. Conclui Item na Produção (Literal)
   * Assinatura: rpc_mark_order_item_done(p_order_item_id)
   */
  async concluirPreparo(orderItemId: string) {
    const { error } = await supabase.rpc('rpc_mark_order_item_done', {
      p_order_item_id: orderItemId,
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_mark_order_item_done:', error);
      throw new Error(error.message || 'Falha ao atualizar status na produção.');
    }
  }
};
