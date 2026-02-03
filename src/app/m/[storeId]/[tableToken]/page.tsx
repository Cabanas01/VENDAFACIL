
'use client';

/**
 * @fileOverview Rota de Entrada do Autoatendimento (QR Code)
 * 
 * Responsável por validar a sessão e identificar a mesa de forma segura via RPC.
 * O fluxo de identificação do cliente ocorre dentro do componente DigitalMenu.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DigitalMenu } from '@/components/menu/digital-menu';
import { Loader2, AlertCircle } from 'lucide-react';
import type { TableInfo, Store } from '@/lib/types';

export default function TableMenuPage() {
  const params = useParams();
  const storeId = params?.storeId as string;
  const tableToken = params?.tableToken as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [comandaId, setComandaId] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  const initializeSession = useCallback(async () => {
    if (!storeId || !tableToken) {
      setError('Link de acesso incompleto. Por favor, verifique o QR Code.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Resolver Mesa via RPC Segura (Valida Token e Existência)
      const { data: tableData, error: tableError } = await supabase.rpc('get_table_by_token', {
        p_store_id: storeId,
        p_table_token: tableToken
      });

      if (tableError || !tableData) {
        console.error('[TABLE_VALIDATION_FAILED]', tableError);
        throw new Error('Link de mesa inválido ou expirado. Peça ajuda ao atendente.');
      }

      const resolvedTableRaw = Array.isArray(tableData) ? tableData[0] : tableData;
      
      if (!resolvedTableRaw) {
          throw new Error('Mesa não encontrada no sistema.');
      }

      // Normalização dos dados da mesa (Independente do formato de retorno da RPC)
      const mappedTable: TableInfo = {
          id: resolvedTableRaw.table_id || resolvedTableRaw.id,
          store_id: resolvedTableRaw.store_id,
          number: resolvedTableRaw.table_number || resolvedTableRaw.number,
          status: resolvedTableRaw.table_status || resolvedTableRaw.status || 'ativo',
          public_token: tableToken
      };
      
      if (!mappedTable.id) {
          throw new Error('Falha ao identificar o código interno da mesa.');
      }

      setTable(mappedTable);

      // 2. Buscar Contexto da Loja (Para Nome e Logo)
      const { data: storeData, error: storeErr } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
      
      if (storeErr || !storeData) {
          console.error('[STORE_FETCH_FAILED]', storeErr);
          throw new Error('Falha ao carregar informações da loja.');
      }
      setStore(storeData);

      // 3. Sincronizar Comanda Aberta para esta mesa via RPC
      const { data: comandaData, error: comandaError } = await supabase.rpc('get_or_create_comanda_by_table', {
        p_table_id: mappedTable.id
      });

      if (comandaError) {
        console.error('[COMANDA_SYNC_FAILED]', comandaError);
        throw new Error('Erro ao sincronizar seu atendimento com o servidor.');
      }

      if (!comandaData) {
          throw new Error('Não foi possível iniciar um atendimento nesta mesa.');
      }

      // Tratamento resiliente do ID da comanda
      const rawComanda = Array.isArray(comandaData) ? comandaData[0] : comandaData;
      const finalComandaId = typeof rawComanda === 'string' 
        ? rawComanda 
        : (rawComanda?.comanda_id || rawComanda?.id);

      if (!finalComandaId) {
          console.error('[COMANDA_ID_EXTRACTION_FAILED]', comandaData);
          throw new Error('Falha ao processar o identificador da comanda.');
      }

      setComandaId(finalComandaId);

    } catch (err: any) {
      console.error('[BOOTSTRAP_FATAL]', err);
      setError(err.message || 'Ocorreu um erro inesperado ao conectar à mesa.');
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
        <p className="font-black uppercase text-[10px] tracking-[0.25em] text-muted-foreground animate-pulse text-center">
          Conectando Mesa...
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
          <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">ACESSO NEGADO</h1>
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
