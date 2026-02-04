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
 * Utilizado principalmente pelo Cardápio Digital (Autoatendimento).
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

  // Insert padronizado com campos de compatibilidade
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
