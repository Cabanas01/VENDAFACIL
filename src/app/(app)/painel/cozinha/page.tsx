
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, History, Loader2, MapPin, CheckCircle2, Play, RefreshCw, AlertTriangle } from 'lucide-react';
import { parseISO, differenceInMinutes } from 'date-fns';
import type { PainelProducaoView } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function CozinhaPage() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<PainelProducaoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchPedidos = useCallback(async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('v_painel_cozinha')
        .select('*')
        .eq('store_id', store.id)
        .in('status', ['pendente', 'em_preparo']);

      if (error) throw error;
      setPedidos(data || []);
    } catch (err: any) {
      console.error('[KDS_FETCH_ERROR]', err);
      toast({ variant: 'destructive', title: 'Erro KDS', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [store?.id, toast]);

  useEffect(() => {
    fetchPedidos();
    const clockInterval = setInterval(() => setNow(new Date()), 30000);

    // Corrigido: table 'comanda_itens' (Português) para bater com o schema real
    const channel = supabase
      .channel('kds_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comanda_itens' 
      }, () => fetchPedidos())
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'comandas',
        filter: `store_id=eq.${store?.id}`
      }, () => fetchPedidos())
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      clearInterval(clockInterval);
    };
  }, [store?.id, fetchPedidos]);

  const handleIniciar = async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('iniciar_preparo_item', { p_item_id: itemId });
      if (error) throw error;
      toast({ title: 'Preparo iniciado!' });
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
      toast({ title: 'Item concluído!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
      fetchPedidos();
    }
  };

  if (loading && pedidos.length === 0) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sincronizando Cozinha...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader title="Cozinha (KDS)" subtitle="Monitor de produção em tempo real." />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchPedidos()} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest">
            <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-primary/20 bg-primary/5 text-primary">
            <ChefHat className="h-4 w-4 text-primary" /> {pedidos.length} Itens em Fila
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => {
          const elapsed = differenceInMinutes(now, parseISO(p.created_at));
          const targetTime = p.prep_time_minutes || 15;
          const isLate = elapsed >= targetTime;

          return (
            <Card key={p.item_id} className={`border-none shadow-xl overflow-hidden transition-all duration-300 ${isLate ? 'ring-2 ring-red-500 ring-offset-2 scale-[1.02]' : 'bg-background border-muted'}`}>
              <div className={`px-6 py-4 flex justify-between items-center border-b ${isLate ? 'bg-red-500 text-white' : 'bg-muted/30 border-muted/20'}`}>
                <div className="flex flex-col">
                  <span className={`text-xl font-black font-headline tracking-tighter uppercase leading-none ${isLate ? 'text-white' : 'text-foreground'}`}>
                    Comanda #{p.comanda_numero}
                  </span>
                  <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] font-black uppercase ${isLate ? 'text-white/80' : 'text-primary'}`}>
                    <MapPin className="h-3 w-3" /> {p.mesa || 'Balcão'}
                  </div>
                </div>
                <div className={`flex flex-col items-end gap-1 font-black uppercase text-[10px] ${isLate ? 'text-white' : 'text-muted-foreground'}`}>
                  <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {elapsed} min</div>
                  {isLate && (
                    <Badge className="bg-white text-red-600 text-[8px] h-4 px-1 gap-1 border-none font-black">
                      <AlertTriangle className="h-2 w-2" /> ATRASADO
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className={`text-3xl font-black leading-tight uppercase tracking-tight ${isLate ? 'text-red-900' : 'text-foreground'}`}>{p.produto}</p>
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-muted/50">
                      {p.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border transition-colors ${isLate ? 'bg-red-600 text-white border-red-700 shadow-lg' : 'bg-primary/10 text-primary border-primary/10'}`}>
                    <span className="text-4xl font-black">{p.qty}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  {p.status === 'pendente' ? (
                    <Button className="w-full h-14 font-black uppercase tracking-widest text-xs shadow-lg" variant="secondary" onClick={() => handleIniciar(p.item_id)}>
                      <Play className="h-4 w-4 mr-2" /> Iniciar Preparo
                    </Button>
                  ) : (
                    <Button className={`w-full h-14 font-black uppercase tracking-widest text-xs transition-all shadow-xl ${isLate ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-950 hover:bg-slate-900'}`} onClick={() => handleConcluir(p.item_id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir Item
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {pedidos.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px] border-muted">
            <History className="h-20 w-20 mx-auto" />
            <p className="text-xl font-black uppercase mt-4">Fila de Cozinha Vazia</p>
          </div>
        )}
      </div>
    </div>
  );
}
