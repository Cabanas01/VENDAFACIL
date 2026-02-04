'use client';

/**
 * @fileOverview Rota de Entrada do Autoatendimento (QR Code).
 * 
 * Captura e valida storeId e tableToken da URL de forma resiliente.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DigitalMenu } from '@/components/menu/digital-menu';
import { Loader2, AlertCircle } from 'lucide-react';
import type { TableInfo, Store } from '@/lib/types';

export default function TableMenuPage() {
  const params = useParams();
  
  // Garantia de captura dos parâmetros conforme estrutura de pastas [storeId]/[tableToken]
  const storeId = params?.storeId as string;
  const tableToken = params?.tableToken as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  const initializeSession = useCallback(async () => {
    if (!storeId || !tableToken) {
      setError('Erro de identificação: Parâmetros da URL ausentes.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Validar Mesa (Acesso Público via Token)
      const { data: tableData, error: tableError } = await supabase.rpc('get_table_by_token', {
        p_store_id: storeId,
        p_table_token: tableToken
      });

      if (tableError || !tableData) {
        throw new Error('Mesa não localizada. Por favor, tente ler o QR Code novamente.');
      }

      const resolvedTable = Array.isArray(tableData) ? tableData[0] : tableData;
      
      if (!resolvedTable) {
        throw new Error('Identificação da mesa inválida.');
      }

      setTable({
        id: resolvedTable.table_id || resolvedTable.id,
        store_id: storeId,
        number: resolvedTable.table_number || resolvedTable.number,
        status: resolvedTable.table_status || resolvedTable.status || 'ativo',
        public_token: tableToken
      });

      // 2. Buscar Dados da Loja
      const { data: storeData, error: storeErr } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();
      
      if (storeErr || !storeData) {
        throw new Error('Falha ao carregar informações da unidade.');
      }
      setStore(storeData);

    } catch (err: any) {
      console.error('[BOOTSTRAP_FATAL]', err);
      setError(err.message || 'Erro de conexão com o estabelecimento.');
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
        <p className="font-black uppercase text-[10px] tracking-[0.25em] text-muted-foreground animate-pulse">
          Sincronizando Cardápio...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center space-y-8 animate-in fade-in duration-500">
        <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 shadow-inner ring-8 ring-red-50/50">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <div className="space-y-2 max-w-xs mx-auto">
          <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">ERRO DE ACESSO</h1>
          <p className="text-muted-foreground font-medium text-sm leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-slate-950 text-white font-black uppercase text-[10px] tracking-[0.2em] h-14 px-12 rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!table || !store) return null;

  return (
    <>
      <DigitalMenu table={table} store={store} />
      
      {/* Debug Info (Apenas para verificação técnica) */}
      <div className="fixed bottom-2 right-2 opacity-0 hover:opacity-100 transition-opacity bg-black/80 text-white p-2 rounded text-[8px] font-mono z-[9999] pointer-events-none">
        STORE: {store.id}<br/>
        TABLE: {table.number}
      </div>
    </>
  );
}
