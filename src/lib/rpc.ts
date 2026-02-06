'use client';

import { supabase } from './supabase/client';

/**
 * @fileOverview Adapter Robusto de Integração RPC (Backend v4.0)
 * 
 * Implementa estratégias de Fallback para Schema Cache (PGRST202)
 * e resolução de ambiguidade de tipos para PostgreSQL (Best Candidate).
 */

/**
 * Busca uma venda aberta ou cria uma nova.
 * Implementa Fallback: Tenta 3 parâmetros, se falhar por cache, tenta 2.
 */
export async function getOpenSaleRpc(
  storeId: string, 
  tableNumber: number, 
  customerName: string | null = null
): Promise<string> {
  const tableInt = Math.floor(tableNumber);
  const finalCustomerName = customerName && customerName.trim() !== '' ? customerName.trim() : null;

  console.debug('[RPC_GET_OPEN_SALE] Tentando assinatura completa (3 params)', { storeId, tableInt, finalCustomerName });

  // Tentativa 1: Assinatura Completa (v4.0)
  const attempt1 = await supabase.rpc('rpc_get_open_sale', {
    p_store_id: storeId,
    p_table_number: tableInt,
    p_customer_name: finalCustomerName
  });

  if (!attempt1.error) return attempt1.data as string;

  // Detecção de Erro de Schema Cache ou Assinatura Inexistente
  const isSchemaError = 
    attempt1.error.code === 'PGRST202' || 
    attempt1.error.message.includes('Could not find the function') ||
    attempt1.error.message.includes('best candidate');

  if (isSchemaError) {
    console.warn('[RPC_GET_OPEN_SALE] Fallback acionado: Assinatura de 3 parâmetros falhou. Tentando 2 parâmetros.');
    
    const attempt2 = await supabase.rpc('rpc_get_open_sale', {
      p_store_id: storeId,
      p_table_number: tableInt
    } as any); // Type cast para permitir fallback se o TS reclamar da assinatura

    if (!attempt2.error) return attempt2.data as string;
    
    throw new Error(attempt2.error.message || 'Falha ao consultar mesa ativa (Fallback)');
  }

  throw new Error(attempt1.error.message || 'Falha ao consultar mesa ativa');
}

/**
 * Adiciona um item à venda.
 * Resolve ambiguidade de tipo (numeric vs integer) enviando como string primeiro.
 */
export async function addItemToSaleRpc(
  saleId: string, 
  productId: string, 
  quantity: number
): Promise<void> {
  console.debug('[RPC_ADD_ITEM] Lançando item', { saleId, productId, quantity });

  // Tentativa 1: Enviar quantidade como STRING (Força o Postgres a fazer cast para numeric e evita ambiguidade)
  const attempt1 = await supabase.rpc('rpc_add_item_to_sale', {
    p_sale_id: saleId,
    p_product_id: productId,
    p_quantity: String(quantity) as any // Coerção para Numeric no lado do servidor
  });

  if (!attempt1.error) return;

  // Se falhar por erro de tipo, tenta como Number purista
  if (attempt1.error.message.includes('candidate') || attempt1.error.message.includes('type')) {
    console.warn('[RPC_ADD_ITEM] Fallback de tipo acionado para p_quantity.');
    const attempt2 = await supabase.rpc('rpc_add_item_to_sale', {
      p_sale_id: saleId,
      p_product_id: productId,
      p_quantity: Number(quantity)
    });

    if (!attempt2.error) return;
    throw new Error(attempt2.error.message || 'Falha ao lançar item (Fallback de tipo)');
  }

  throw new Error(attempt1.error.message || 'Falha ao lançar item no pedido');
}

/**
 * Fecha a venda e gera o faturamento.
 * Normaliza métodos de pagamento para os enums do banco.
 */
export async function closeSaleRpc(
  saleId: string, 
  paymentMethod: string
): Promise<any> {
  // Mapa de normalização
  const methodMap: Record<string, string> = {
    'Dinheiro': 'cash',
    'Pix QR Code': 'pix',
    'Cartão': 'card',
    'cash': 'cash',
    'pix': 'pix',
    'card': 'card'
  };

  const finalMethod = methodMap[paymentMethod] || 'cash';

  console.debug('[RPC_CLOSE_SALE] Finalizando faturamento', { saleId, finalMethod });

  const { data, error } = await supabase.rpc('fechar_comanda', {
    p_comanda_id: saleId,
    p_forma_pagamento: finalMethod
  });

  if (error) {
    console.error('[RPC_CLOSE_SALE_ERROR]', error);
    throw new Error(error.message || 'Falha ao finalizar faturamento no servidor.');
  }

  return data;
}
