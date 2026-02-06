
'use server';

/**
 * @fileOverview Server Action robusta para Processamento de Vendas.
 * Sincronizada para utilizar exclusivamente as RPCs transacionais e forçar numeric.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CartItem } from '@/lib/types';

export async function processSaleAction(
  storeId: string, 
  cart: CartItem[], 
  paymentMethod: string,
  customerId?: string | null
) {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  try {
    // 1. Criar comanda temporária para a venda
    const { data: comanda, error: cmdErr } = await supabaseAdmin
      .from('comandas')
      .insert({ 
        store_id: storeId, 
        numero: '0', 
        mesa: 'PDV', 
        cliente_nome: 'Consumidor',
        status: 'aberta' 
      })
      .select('id')
      .single();

    if (cmdErr) throw cmdErr;

    // 2. Lançar itens via RPC (Garante line_total correto e delega unit_price ao banco)
    for (const item of cart) {
      const { error: itemErr } = await supabaseAdmin.rpc('rpc_add_item_to_comanda', {
        p_comanda_id: comanda.id,
        p_product_id: item.product_id,
        p_quantity: parseFloat(item.qty.toString())
      });
      if (itemErr) throw itemErr;
    }

    // 3. Fechar via RPC (Garante criação de sale e vinculação atômica)
    const { data: closeData, error: closeErr } = await supabaseAdmin.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comanda.id,
      p_payment_method_id: paymentMethod
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
