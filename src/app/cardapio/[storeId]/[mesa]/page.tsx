
'use client';

/**
 * @fileOverview Cardápio Digital Público (Fluxo do Cliente)
 * 
 * Rota pública para pedidos via QR Code em mesa.
 * Ordem: Escolha -> Identificação -> Envio para Preparo.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DigitalMenu } from '@/components/menu/digital-menu';
import { isValidUUID } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import type { TableInfo, Store } from '@/lib/types';

export default function PublicCardapioPage() {
  const params = useParams();
  
  const storeId = params?.storeId as string;
  const mesaId = params?.mesa as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  const initialize = useCallback(async () => {
    if (!storeId || !mesaId) {
      setError('Identificação da mesa ou loja ausente.');
      setLoading(false);
      return;
    }

    if (!isValidUUID(storeId)) {
      setError('Loja inválida.');
      setLoading(false);
      return;
    }

    try {
      // 1. Buscar Dados da Loja
      const { data: storeData, error: storeErr } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();
      
      if (storeErr || !storeData) {
        throw new Error('Falha ao carregar informações do estabelecimento.');
      }
      setStore(storeData);

      // 2. Mock da Tabela (ou busca se houver tabela real no futuro)
      setTable({
        id: `table_${mesaId}`,
        store_id: storeId,
        number: parseInt(mesaId),
        status: 'ativo',
        public_token: '' // Não utilizado neste fluxo simples
      });

    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [storeId, mesaId]);

  useEffect(() => { initialize(); }, [initialize]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-[0.25em] text-muted-foreground animate-pulse">Sincronizando Cardápio...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center space-y-8">
      <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 shadow-inner">
        <AlertCircle className="h-16 w-16 text-red-500" />
      </div>
      <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">ERRO DE ACESSO</h1>
      <p className="text-muted-foreground font-medium text-sm">{error}</p>
      <button onClick={() => window.location.reload()} className="bg-slate-950 text-white font-black uppercase text-[10px] tracking-[0.2em] h-14 px-12 rounded-2xl shadow-xl shadow-slate-200">Tentar Novamente</button>
    </div>
  );

  if (!table || !store) return null;

  return <DigitalMenu table={table} store={store} />;
}
