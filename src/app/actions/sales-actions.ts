
'use server';

/**
 * @fileOverview Server Action para Processamento de Vendas (PDV)
 * 
 * PADRÃO OBRIGATÓRIO: Esta ação roda no servidor e utiliza cookies para garantir
 * que a identidade do usuário (auth.uid()) seja propagada para o Supabase.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CartItem } from '@/lib/types';

export async function processSaleAction(cart: CartItem[], paymentMethod: string) {
  // 1. Instanciar o client Supabase com Cookies (Obrigatório para auth.uid())
  const supabase = createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  // 2. Teste de Identidade (Garantia de Sessão)
  const { data: auth, error: authError } = await supabase.auth.getUser();
  
  if (authError || !auth.user) {
    console.error('[SERVER_ACTION_AUTH_FAIL] AUTH UID NULL – sessão não propagada');
    return { success: false, error: 'Sessão expirada ou inválida. Por favor, saia e entre novamente.' };
  }

  // Log de auditoria interna (apenas para debug)
  console.log('[SALE_IDENTIDADE_SYNC] Usuário autenticado no servidor:', auth.user.id);

  try {
    // 3. Localização do Tenant (Store)
    // Buscamos a loja onde o usuário é dono ou membro
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', auth.user.id)
      .maybeSingle();

    let finalStoreId = store?.id;

    if (!finalStoreId) {
      const { data: member } = await supabase
        .from('store_members')
        .select('store_id')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      finalStoreId = member?.store_id;
    }

    if (!finalStoreId) {
      return { success: false, error: 'Não foi possível vincular a venda a uma loja válida.' };
    }

    const totalCents = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);

    // 4. Inserção do Cabeçalho da Venda
    // Usamos o client 'supabase' (com cookies) para que o banco execute a venda
    // respeitando as políticas de RLS e triggers de limite de plano.
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        store_id: finalStoreId,
        total_cents: totalCents,
        payment_method: paymentMethod as any
      })
      .select()
      .single();

    if (saleError) {
      console.error('[SERVER_ACTION_INSERT_SALE_FAIL]', saleError);
      
      // Tradução de erros conhecidos de banco/triggers
      if (saleError.message.includes('trial_sales_limit')) {
        return { success: false, error: 'Limite de 5 vendas atingido no Plano de Avaliação. Faça o upgrade para continuar vendendo.' };
      }
      
      return { success: false, error: 'O sistema recusou a venda (Acesso Negado ou Limite do Plano).' };
    }

    // 5. Inserção dos Itens da Venda (Batch)
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
    
    if (itemsError) {
      console.error('[SERVER_ACTION_ITEMS_FAIL] Erro ao inserir itens:', itemsError);
      // Rollback manual via Admin (Service Role) para não deixar a venda órfã
      await supabaseAdmin.from('sales').delete().eq('id', sale.id);
      return { success: false, error: 'Falha ao processar os itens da venda.' };
    }

    // 6. Baixa de Estoque
    for (const item of cart) {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });
    }

    return { success: true, saleId: sale.id };

  } catch (err: any) {
    console.error('[SERVER_ACTION_EXCEPTION]', err);
    return { success: false, error: 'Ocorreu um erro inesperado no processamento da venda.' };
  }
}
