
'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview SERVIÇO CANÔNICO v6.0
 * 
 * Central de mutações transacionais. O frontend não possui lógica financeira.
 * Todas as funções operam sob o padrão RPC-FIRST.
 */

export const ComandaService = {
  /**
   * 1. Abre ou Recupera Venda Aberta (Mesa ou PDV)
   * PDV utiliza p_table = '0'
   */
  async getOrCreateSale(storeId: string, table: string) {
    const { data, error } = await supabase.rpc('rpc_get_open_sale', {
      p_store_id: storeId,
      p_table: String(table)
    });

    if (error) {
      console.error('[RPC_ERROR] rpc_get_open_sale:', error);
      throw new Error(error.message);
    }

    return data as string; // Retorna sale_id (UUID)
  },

  /**
   * 2. Adiciona Item à Venda
   * Backend resolve preço e subtotal. Frontend não envia totais.
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
   * 3. Fecha Venda e Gera Faturamento
   * Métodos válidos: 'cash' | 'pix' | 'card'
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
   * 4. Conclui Item na Produção (KDS/BDS)
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
