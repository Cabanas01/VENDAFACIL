
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
 * Função Oficial Única para Adicionar Itens em Comandas.
 * Resolve a comanda aberta para o número informado e insere o item padronizado.
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
  // 1. Backend resolve a comanda (get_or_create_open_comanda deve existir no banco)
  const { data: comandaId, error: comandaError } = await supabase.rpc(
    'get_or_create_open_comanda',
    {
      p_store_id: storeId,
      p_numero: numeroComanda,
    }
  );

  if (comandaError) throw comandaError;

  // 2. Insert Padronizado com compatibilidade para colunas em português
  const { error } = await supabase.from('comanda_itens').insert({
    comanda_id: comandaId,
    product_id: productId,
    product_name: productName,
    qty,
    unit_price: unitPrice,
    quantidade: qty,           // Compatibilidade legada
    preco_unitario: unitPrice, // Compatibilidade legada
    destino_preparo: destino,
    status: 'pendente',
  });

  if (error) throw error;
  
  return comandaId;
}
