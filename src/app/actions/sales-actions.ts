'use server';

/**
 * @fileOverview Server Action para Processamento de Vendas (PDV Direto).
 * Sincronizado para usar estritamente as RPCs transacionais, respeitando colunas geradas.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CartItem } from '@/lib/types';

export async function processSaleAction(
  storeId: string, 
  cart: CartItem[], 
  paymentMethod: string
) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // 1. Criar comanda temporária para a venda (Número '0' = PDV Direto)
    const { data: comanda, error: cmdErr } = await supabaseAdmin
      .from('comandas')
      .insert({ 
        store_id: storeId, 
        numero: '0', 
        mesa: 'PDV', 
        cliente_nome: 'Consumidor Final',
        status: 'aberta' 
      })
      .select('id')
      .single();

    if (cmdErr) throw cmdErr;

    // 2. Lançar itens via RPC (O banco resolve unit_price e line_total)
    // Força conversão para numeric para evitar ambiguidade de assinatura.
    for (const item of cart) {
      const { error: itemErr } = await supabaseAdmin.rpc('rpc_add_item_to_comanda', {
        p_comanda_id: comanda.id,
        p_product_id: item.product_id,
        p_quantity: parseFloat(item.qty.toString()),
        p_unit_price: null
      });
      if (itemErr) throw itemErr;
    }

    // 3. Fechar via RPC (Garante cálculo atômico no PostgreSQL)
    const { data: closeData, error: closeErr } = await supabaseAdmin.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comanda.id,
      p_payment_method_id: paymentMethod,
      p_cash_register_id: null
    });

    if (closeErr) throw closeErr;

    return { 
      success: true, 
      saleId: (closeData as any)?.sale_id
    };

  } catch (err: any) {
    console.error('[SERVER_PDV_FATAL]', err);
    return { 
      success: false, 
      error: err.message || 'Falha ao processar venda no servidor.' 
    };
  }
}
