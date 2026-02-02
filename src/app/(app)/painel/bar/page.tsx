'use client';

/**
 * @fileOverview Painel de Bar (BDS) - Versão Sincronizada por Item.
 * Consome exclusivamente a view v_painel_bar.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlassWater, Clock, History, Loader2, MapPin, CheckCircle2, Play, RefreshCw } from 'lucide-react';
import { parseISO, differenceInMinutes } from 'date-fns';
import type { PainelProducaoView } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function BarPage() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<PainelProducaoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchPedidos = useCallback(async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('v_painel_bar')
        .select('*')
        .eq('store_id', store.id);

      if (error) throw error;
      setPedidos(data || []);
    } catch (err: any) {
      console.error('[BDS_FETCH_ERROR]', err);
      toast({ variant: 'destructive', title: 'Erro BDS', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [store?.id, toast]);

  useEffect(() => {
    fetchPedidos();
    const clockInterval = setInterval(() => setNow(new Date()), 30000);

    const channel = supabase
      .channel('bds_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comanda_itens' 
      }, () => fetchPedidos())
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'comandas'
      }, () => fetchPedidos())
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      clearInterval(clockInterval);
    };
  }, [fetchPedidos]);

  const handleIniciar = async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('iniciar_preparo_item', { p_item_id: itemId });
      if (error) throw error;
      toast({ title: 'Iniciado!' });
      await fetchPedidos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  const handleConcluir = async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('concluir_item', { p_item_id: itemId });
      if (error) throw error;
      
      setPedidos(prev => prev.filter(p => p.item_id !== itemId));
      toast({ title: 'Drink pronto!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
      fetchPedidos();
    }
  };

  if (loading && pedidos.length === 0) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sincronizando Bar...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader title="Bar (BDS)" subtitle="Monitor de bebidas e coquetéis." />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPedidos} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest">
            <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-cyan-200 bg-cyan-50 text-cyan-600">
            <GlassWater className="h-4 w-4" /> {pedidos.length} Pedidos
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => {
          const elapsed = differenceInMinutes(now, parseISO(p.created_at));
          const targetTime = p.prep_time_minutes || 5;
          const isLate = elapsed >= targetTime;

          return (
            <Card key={p.item_id} className={`border-none shadow-xl overflow-hidden transition-all duration-300 ${isLate ? 'atrasado ring-2 ring-red-500 ring-offset-2' : 'bg-background border-muted'}`}>
              <div className={`px-6 py-4 flex justify-between items-center border-b ${isLate ? 'bg-red-500/10 border-red-500/20' : 'bg-cyan-500/5 border-cyan-500/10'}`}>
                <div className="flex flex-col">
                  <span className={`text-2xl font-black font-headline tracking-tighter uppercase leading-none ${isLate ? 'text-red-700' : 'text-foreground'}`}>
                    Comanda #{p.comanda_numero}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-black uppercase text-cyan-600">
                    <MapPin className="h-3 w-3" /> {p.mesa || 'Balcão'}
                  </div>
                </div>
                <div className={`flex flex-col items-end gap-1 font-black uppercase text-[10px] ${isLate ? 'text-red-600' : 'text-muted-foreground'}`}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {elapsed} min
                  </div>
                  {isLate && <Badge className="bg-red-600 text-[8px] h-4 px-1 gap-1 border-none shadow-lg shadow-red-200">ATRASADO</Badge>}
                </div>
              </div>
              
              <CardContent className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className={`text-3xl font-black leading-tight uppercase tracking-tight ${isLate ? 'text-red-900' : 'text-cyan-700'}`}>{p.produto}</p>
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">{p.status?.replace('_', ' ')}</Badge>
                  </div>
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border transition-colors ${isLate ? 'bg-red-600 text-white border-red-700 shadow-lg' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
                    <span className="text-4xl font-black">{p.quantidade}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {p.status === 'pendente' ? (
                    <Button className="flex-1 h-14 font-black uppercase tracking-widest text-xs" variant="outline" onClick={() => handleIniciar(p.item_id)}>
                      <Play className="h-4 w-4 mr-2" /> Iniciar
                    </Button>
                  ) : (
                    <Button 
                      className={`flex-1 h-14 font-black uppercase tracking-widest text-xs transition-all ${isLate ? 'bg-red-600 hover:bg-red-700 shadow-xl shadow-red-300' : 'bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-100'}`} 
                      onClick={() => handleConcluir(p.item_id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {pedidos.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px]">
            <History className="h-20 w-20 mx-auto text-cyan-600" />
            <p className="text-xl font-black uppercase mt-4 text-foreground">Bar em Ordem</p>
          </div>
        )}
      </div>
    </div>
  );
}