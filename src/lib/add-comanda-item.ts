
import { supabase } from '@/lib/supabase/client';

/**
 * REGRA DE OURO: NUNCA faz insert direto em order_items. 
 * SEMPRE usa RPC para respeitar a coluna gerada line_total e delegar unit_price ao banco.
 */
export async function addComandaItemById({
  comandaId,
  productId,
  qty,
}: {
  comandaId: string;
  productId: string;
  qty: number;
}) {
  if (!comandaId || !productId) throw new Error('IDs obrigatórios ausentes');

  const { error } = await supabase.rpc('rpc_add_item_to_comanda', {
    p_comanda_id: comandaId,
    p_product_id: productId,
    p_quantity: parseFloat(qty.toString())
  });

  if (error) throw error;
}

/**
 * Resolve a comanda aberta pelo número e insere o item via RPC.
 */
export async function addComandaItemByNumero({
  storeId,
  numeroComanda,
  productId,
  qty,
}: {
  storeId: string;
  numeroComanda: string;
  productId: string;
  qty: number;
}) {
  const { data: openComanda } = await supabase
    .from('comandas')
    .select('id')
    .eq('store_id', storeId)
    .eq('numero', numeroComanda)
    .eq('status', 'aberta')
    .maybeSingle();

  let comandaId = openComanda?.id;

  if (!comandaId) {
    const { data: newComanda, error: createError } = await supabase
      .from('comandas')
      .insert({
        store_id: storeId,
        numero: numeroComanda,
        status: 'aberta'
      })
      .select('id')
      .single();
    
    if (createError) throw createError;
    comandaId = newComanda.id;
  }

  await addComandaItemById({
    comandaId,
    productId,
    qty
  });
  
  return comandaId;
}
