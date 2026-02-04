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
  const { data, error: comandaError } = await supabase.rpc(
    'get_or_create_open_comanda',
    {
      p_store_id: storeId,
      p_numero: numeroComanda,
    }
  );

  if (comandaError) {
    console.error('[RPC_COMANDA_ERROR]', comandaError);
    throw new Error('Não foi possível inicializar sua comanda.');
  }

  // A RPC pode retornar o ID direto ou um objeto com o ID
  const comandaId = typeof data === 'string' ? data : (data?.comanda_id || data?.id);

  if (!comandaId) {
    throw new Error('Falha ao identificar atendimento ativo.');
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
