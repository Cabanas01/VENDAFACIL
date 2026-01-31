
'use server';

/**
 * @fileOverview Server Action definitiva para Processamento de Vendas (PDV).
 * 
 * Segue o padrão obrigatório @supabase/ssr para garantir que auth.uid() 
 * seja propagado corretamente para o banco de dados.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CartItem, Database } from '@/lib/types';

export async function processSaleAction(storeId: string, cart: CartItem[], paymentMethod: string) {
  // 1. Instanciação OBRIGATÓRIA do client dentro da Action com cookies
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 2. Teste de Identidade (Vital para RLS)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('[SERVER_ACTION] AUTH UID NULL – sessão não propagada');
    return { success: false, error: 'Sessão expirada ou não propagada. Por favor, faça login novamente.' };
  }

  console.log('[SERVER_ACTION] AUTH USER IDENTIFICADO:', user.id);

  if (!storeId) {
    return { success: false, error: 'ID da loja não fornecido. Operação bloqueada.' };
  }

  const totalCents = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);

  // 3. Inserção do Cabeçalho da Venda
  // Aqui o WITH CHECK do RLS validará store_id + store_access + auth.uid()
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      store_id: storeId,
      total_cents: totalCents,
      payment_method: paymentMethod as any
    })
    .select()
    .single();

  if (saleError) {
    console.error('[SERVER_ACTION] ERRO NO INSERT SALES:', {
      code: saleError.code,
      message: saleError.message,
      storeId
    });

    let friendlyMessage = 'Erro de permissão: Verifique se seu plano está ativo.';
    
    if (saleError.message.includes('trial_sales_limit')) {
      friendlyMessage = 'Limite de 5 vendas atingido no Plano de Avaliação. Faça o upgrade para continuar.';
    } else if (saleError.code === '42501') {
      friendlyMessage = 'Acesso Negado (RLS). Sua identidade não foi reconhecida pelo banco ou o plano expirou.';
    }
    
    return { success: false, error: friendlyMessage, code: saleError.code };
  }

  try {
    // 4. Inserção dos Itens em Batch
    const itemsToInsert = cart.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name_snapshot,
      product_barcode_snapshot: item.product_barcode_snapshot || null,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      subtotal_cents: item.subtotal_cents
    }));

    const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // 5. Baixa de Estoque via RPC (Operação Atômica)
    for (const item of cart) {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });
    }

    return { success: true, saleId: sale.id };

  } catch (err: any) {
    console.error('[SERVER_ACTION] FALHA NA TRANSAÇÃO - Executando estorno...', err);
    // Rollback manual do cabeçalho caso os itens falhem
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from('sales').delete().eq('id', sale.id);
    return { success: false, error: 'Falha ao registrar itens da venda. A transação foi revertida.' };
  }
}
