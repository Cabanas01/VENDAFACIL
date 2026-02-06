'use server';

/**
 * @fileOverview Server Action para Processamento de Vendas - Sincronizado com Mapeamento RPC v3.1.
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
    // 1. Abrir comanda temporária via RPC oficial (Mesa '0' = PDV Direto)
    const { data: comandaId, error: cmdErr } = await supabaseAdmin.rpc('abrir_comanda', {
      p_mesa: '0',
      p_cliente_nome: 'Consumidor Final'
    });

    if (cmdErr) throw cmdErr;

    // 2. Lançar itens via RPC oficial (adicionar_item_comanda)
    // O banco resolve preço e subtotal automaticamente
    for (const item of cart) {
      const { error: itemErr } = await supabaseAdmin.rpc('adicionar_item_comanda', {
        p_comanda_id: comandaId,
        p_product_id: item.product_id,
        p_quantity: Math.floor(item.qty)
      });
      if (itemErr) throw itemErr;
    }

    // 3. Fechar via RPC oficial (fechar_comanda) - Atômico
    const { data: closeData, error: closeErr } = await supabaseAdmin.rpc('fechar_comanda', {
      p_comanda_id: comandaId,
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
