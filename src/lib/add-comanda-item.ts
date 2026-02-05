import { supabase } from '@/lib/supabase/client';

type AddItemParams = {
  storeId: string;
  numeroComanda: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
};

/**
 * REGRA DE OURO: NUNCA faz insert direto. SEMPRE usa RPC.
 * O banco calcula o line_total.
 */
export async function addComandaItemById({
  comandaId,
  productId,
  qty,
  unitPrice,
}: {
  comandaId: string;
  productId: string;
  qty: number;
  unitPrice: number;
}) {
  if (!comandaId || !productId) throw new Error('IDs obrigatórios ausentes');

  const { error } = await supabase.rpc('rpc_add_item_to_comanda', {
    p_comanda_id: comandaId,
    p_product_id: productId,
    p_quantity: qty,
    p_unit_price: unitPrice
  });

  if (error) throw error;
}

/**
 * Resolve a comanda aberta pelo número e insere o item via RPC.
 */
export async function addComandaItem({
  storeId,
  numeroComanda,
  productId,
  qty,
  unitPrice,
}: AddItemParams) {
  if (!productId) throw new Error('Dados do item ausentes');

  // 1. Resolver o ID da comanda
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

  // 2. Inserir o item via RPC (Garante line_total correto)
  await addComandaItemById({
    comandaId,
    productId,
    qty,
    unitPrice
  });
  
  return comandaId;
}

export { addComandaItem as addComandaItemByNumero };
