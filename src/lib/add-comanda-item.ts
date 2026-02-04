import { supabase } from '@/lib/supabase/client';

/**
 * Helper para o Cardápio Digital (Público)
 * Resolve a comanda aberta pela loja/número antes de inserir.
 */
export async function addComandaItemByNumero({
  storeId,
  numeroComanda,
  productId,
  productName,
  qty,
  unitPrice,
  destino,
}: {
  storeId: string;
  numeroComanda: number;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  destino: 'cozinha' | 'bar' | 'nenhum';
}) {
  const { data: comandaId, error: comandaError } = await supabase.rpc(
    'get_or_create_open_comanda',
    {
      p_store_id: storeId,
      p_numero: numeroComanda,
    }
  );

  if (comandaError || !comandaId) {
    throw comandaError || new Error('Falha ao resolver comanda');
  }

  const { error } = await supabase.from('comanda_itens').insert({
    comanda_id: comandaId,
    product_id: productId,
    product_name: productName,
    qty: qty,
    unit_price: unitPrice,
    quantidade: qty,           // compatibilidade legada
    preco_unitario: unitPrice, // compatibilidade legada
    destino_preparo: destino,
    status: 'pendente',
  });

  if (error) throw error;
  return comandaId;
}

/**
 * Helper para o Painel Administrativo
 * Insere itens diretamente usando o UUID da comanda (Fonte da Verdade).
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
    qty: qty,
    unit_price: unitPrice,
    quantidade: qty,           // compatibilidade legada
    preco_unitario: unitPrice, // compatibilidade legada
    destino_preparo: destino,
    status: 'pendente',
  });

  if (error) throw error;
}
