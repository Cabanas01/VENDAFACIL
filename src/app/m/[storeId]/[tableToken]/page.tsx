'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DigitalMenu } from '@/components/menu/digital-menu';
import { Loader2, AlertCircle } from 'lucide-react';
import type { TableInfo, Store } from '@/lib/types';

export default function TableMenuPage() {
  const { storeId, tableToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [comandaId, setComandaId] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  const initializeSession = useCallback(async () => {
    if (!storeId || !tableToken) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Resolver Mesa
      const { data: tableData, error: tableError } = await supabase.rpc('get_table_by_token', {
        p_store_id: storeId as string,
        p_table_token: tableToken as string
      });

      if (tableError || !tableData || (Array.isArray(tableData) && tableData.length === 0)) {
        throw new Error('Link de mesa inválido ou expirado.');
      }

      const resolvedTable = Array.isArray(tableData) ? tableData[0] : tableData;
      setTable(resolvedTable);

      // 2. Buscar Dados da Loja (Nome, Logo)
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
      
      setStore(storeData);

      // 3. Obter ou Criar Comanda
      const { data: comandaData, error: comandaError } = await supabase.rpc('get_or_create_comanda_by_table', {
        p_table_id: resolvedTable.table_id
      });

      if (comandaError || !comandaData) {
        throw new Error('Falha ao sincronizar comanda da mesa.');
      }

      setComandaId(typeof comandaData === 'string' ? comandaData : (comandaData as any).comanda_id);

    } catch (err: any) {
      console.error('[MENU_INIT_ERROR]', err);
      setError(err.message || 'Erro ao carregar o cardápio.');
    } finally {
      setLoading(false);
    }
  }, [storeId, tableToken]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground animate-pulse">
          Abrindo Cardápio Digital...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center space-y-6">
        <div className="bg-red-50 p-6 rounded-full border border-red-100 shadow-inner">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Acesso Negado</h1>
          <p className="text-muted-foreground font-medium text-sm leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-primary text-white font-black uppercase text-xs tracking-widest h-14 px-10 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!table || !comandaId || !store) return null;

  return (
    <DigitalMenu 
      table={table} 
      comandaId={comandaId} 
      store={store} 
    />
  );
}
