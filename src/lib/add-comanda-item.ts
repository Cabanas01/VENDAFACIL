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
  const { data, error: comandaError } = await supabase.rpc(
    'get_or_create_open_comanda',
    {
      p_store_id: storeId,
      p_numero: numeroComanda,
    }
  );

  if (comandaError || !data) {
    throw comandaError || new Error('Falha ao resolver comanda para esta mesa.');
  }

  // Tratar retorno flexível da RPC (ID direto ou objeto)
  const comandaId = typeof data === 'string' ? data : (data as any).id || (data as any).comanda_id;

  // 2. Inserir o item com mapeamento para campos legados e novos
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
