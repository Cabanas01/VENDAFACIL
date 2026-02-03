
'use client';

/**
 * @fileOverview Rota de Entrada do Autoatendimento (QR Code)
 * 
 * Responsável por validar a sessão e identificar a mesa de forma segura via RPC.
 */

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
      // 1. Resolver Mesa via RPC Segura
      const { data: tableData, error: tableError } = await supabase.rpc('get_table_by_token', {
        p_store_id: storeId as string,
        p_table_token: tableToken as string
      });

      if (tableError || !tableData || (Array.isArray(tableData) && tableData.length === 0)) {
        console.error('[TABLE_ERROR]', tableError);
        throw new Error('Link de mesa inválido ou expirado. Por favor, peça ajuda ao atendente.');
      }

      const resolvedTable = Array.isArray(tableData) ? tableData[0] : tableData;
      setTable(resolvedTable);

      // 2. Buscar Contexto da Loja
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
      
      setStore(storeData);

      // 3. Sincronizar Comanda Aberta (ou Criar Nova)
      const { data: comandaData, error: comandaError } = await supabase.rpc('get_or_create_comanda_by_table', {
        p_table_id: resolvedTable.table_id
      });

      if (comandaError || !comandaData) {
        throw new Error('Falha ao sincronizar atendimento da mesa.');
      }

      setComandaId(typeof comandaData === 'string' ? comandaData : (comandaData as any).comanda_id);

    } catch (err: any) {
      console.error('[MENU_BOOTSTRAP_ERROR]', err);
      setError(err.message || 'Erro inesperado ao carregar o cardápio.');
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
        <p className="font-black uppercase text-[10px] tracking-[0.25em] text-muted-foreground animate-pulse text-center px-10">
          Validando Mesa &<br/>Conectando Cardápio...
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
        <div className="space-y-2 max-w-xs">
          <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Link Inválido</h1>
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

  if (!table || !comandaId || !store) return null;

  return (
    <DigitalMenu 
      table={table} 
      comandaId={comandaId} 
      store={store} 
    />
  );
}
