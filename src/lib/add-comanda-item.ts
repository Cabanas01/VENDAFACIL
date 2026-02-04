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
 * Função unificada para adicionar item via número de comanda (Digital Menu).
 * Resolve a comanda aberta no banco de dados antes da inserção.
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

  const { data: comandaId, error: comandaError } = await supabase.rpc(
    'get_or_create_open_comanda',
    {
      p_store_id: storeId,
      p_numero: numeroComanda,
    }
  );

  if (comandaError || !comandaId) {
    throw comandaError || new Error('Comanda inválida');
  }

  const { error } = await supabase.from('comanda_itens').insert({
    comanda_id: comandaId,
    product_id: productId,
    product_name: productName,
    qty,
    unit_price: unitPrice,
    quantidade: qty,           // compatibilidade
    preco_unitario: unitPrice, // compatibilidade
    destino_preparo: destino,
    status: 'pendente',
  });

  if (error) throw error;
  
  return comandaId;
}

/**
 * Helper para o Painel Administrativo.
 * Insere itens diretamente usando o UUID da comanda.
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
  destino: 'cozinha' | 'bar' | 'nenhum';
}) {
  const { error } = await supabase.from('comanda_itens').insert({
    comanda_id: comandaId,
    product_id: productId,
    product_name: productName,
    qty,
    unit_price: unitPrice,
    quantidade: qty,
    preco_unitario: unitPrice,
    destino_preparo: destino,
    status: 'pendente',
  });

  if (error) throw error;
}
