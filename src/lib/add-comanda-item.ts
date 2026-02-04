import { supabase } from '@/lib/supabase/client';

type AddItemParams = {
  storeId: string;
  numeroComanda: number;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  destino: 'cozinha' | 'bar' | 'nenhum';
};

/**
 * Insere item diretamente usando o ID da comanda.
 */
export async function addComandaItemById({
  comandaId,
  productId,
  productName,
  qty,
  unitPrice,
  destino,
}: {
  comandaId: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  destino: string;
}) {
  if (!comandaId || !productId) throw new Error('IDs obrigatórios ausentes');

  const { error } = await supabase.from('comanda_itens').insert({
    comanda_id: comandaId,
    product_id: productId,
    product_name: productName,
    qty: qty,
    unit_price: unitPrice,
    quantidade: qty,           // Compatibilidade legada
    preco_unitario: unitPrice, // Compatibilidade legada
    destino_preparo: destino,
    status: 'pendente',
  });

  if (error) throw error;
}

/**
 * Resolve a comanda aberta pelo número (Mesa) e insere o item.
 */
export async function addComandaItem({
  storeId,
  numeroComanda,
  productId,
  productName,
  qty,
  unitPrice,
  destino,
}: AddItemParams) {
  if (!productId || !productName) throw new Error('Dados do item ausentes');

  // 1. Resolver o ID da comanda (Busca aberta ou cria nova)
  const { data: openComanda } = await supabase
    .from('comandas')
    .select('id')
    .eq('store_id', storeId)
    .eq('numero', numeroComanda)
    .in('status', ['aberta', 'em_preparo', 'pronta', 'aguardando_pagamento'])
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

  // 2. Inserir o item
  await addComandaItemById({
    comandaId,
    productId,
    productName,
    qty,
    unitPrice,
    destino
  });
  
  return comandaId;
}

// Alias para compatibilidade com chamadas que usam o sufixo ByNumero
export { addComandaItem as addComandaItemByNumero };
