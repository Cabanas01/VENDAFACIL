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
 * Função Única e Oficial para Adicionar Item em Comanda.
 * Resolve a comanda aberta e insere o item com compatibilidade total de colunas.
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

  // 1️⃣ Backend resolve a comanda (Busca aberta ou cria uma nova)
  const { data: comandaId, error: comandaError } = await supabase.rpc(
    'get_or_create_open_comanda',
    {
      p_store_id: storeId,
      p_numero: numeroComanda,
    }
  );

  if (comandaError || !comandaId) {
    throw comandaError || new Error('Comanda inválida ou não encontrada');
  }

  // 2️⃣ Insert padronizado com campos em inglês e português para compatibilidade
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
