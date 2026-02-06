'use server';

/**
 * @fileOverview Server Action para Processamento de Vendas (PDV Direto).
 * Blindado conforme o Contrato RPC Final: p_unit_price é enviado como null.
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
    // 1. Criar comanda temporária para a venda (Mesa 0 = PDV Direto)
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

    // 2. Lançar itens via RPC (Garante line_total correto e delega unit_price ao banco)
    // ✅ Regra de Ouro: Passar os 4 parâmetros exigidos pela RPC
    for (const item of cart) {
      const { error: itemErr } = await supabaseAdmin.rpc('rpc_add_item_to_comanda', {
        p_comanda_id: comanda.id,
        p_product_id: item.product_id,
        p_quantity: parseFloat(item.qty.toString()),
        p_unit_price: null // Permite que o banco busque o preço oficial do cadastro
      });
      if (itemErr) throw itemErr;
    }

    // 3. Fechar via RPC (Garante criação de sale e vinculação atômica)
    const { data: closeData, error: closeErr } = await supabaseAdmin.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comanda.id,
      p_payment_method_id: paymentMethod,
      p_cash_register_id: null // Em PDV direto, o cash_register_id é resolvido na função se houver um aberto
    });

    if (closeErr) throw closeErr;

    return { 
      success: true, 
      saleId: (closeData as any)?.sale_id
    };

  } catch (err: any) {
    console.error('[PROCESS_SALE_ACTION_FATAL]', err);
    return { 
      success: false, 
      error: err.message || 'Falha ao processar venda via servidor.' 
    };
  }
}
