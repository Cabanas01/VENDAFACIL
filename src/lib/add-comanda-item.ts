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
 * Resolve a comanda aberta pelo número (Mesa) e insere o item.
 * Utilizado pelo Cardápio Digital (Autoatendimento).
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
  if (!productId || !productName || !qty || !unitPrice) {
    throw new Error('Dados obrigatórios do item ausentes');
  }

  // 1. Resolver o ID da comanda
  // Buscamos manualmente uma comanda aberta para evitar o erro de check constraint da RPC legada
  const { data: openComanda } = await supabase
    .from('comandas')
    .select('id')
    .eq('store_id', storeId)
    .eq('numero', numeroComanda)
    .in('status', ['aberta', 'em_preparo', 'pronta', 'aguardando_pagamento'])
    .maybeSingle();

  let comandaId = openComanda?.id;

  if (!comandaId) {
    // Se não existir uma aberta, criamos uma nova garantindo o status 'aberta'
    const { data: newComanda, error: createError } = await supabase
      .from('comandas')
      .insert({
        store_id: storeId,
        numero: numeroComanda,
        status: 'aberta'
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('[CREATE_COMANDA_ERROR]', createError);
      throw new Error(`Falha ao iniciar atendimento: ${createError.message}`);
    }
    comandaId = newComanda.id;
  }

  // 2. Inserir o item com mapeamento duplo para compatibilidade de colunas
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

  if (error) {
    console.error('[INSERT_ITEM_ERROR]', error);
    throw error;
  }
  
  return comandaId;
}

/**
 * Insere item diretamente usando o ID da comanda.
 * Utilizado pelo Painel Administrativo.
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

export { addComandaItem as addComandaItemByNumero };
