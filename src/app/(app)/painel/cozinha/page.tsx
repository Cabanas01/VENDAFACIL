'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, History, Loader2, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
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
      // Regra de Ouro: Consultar a View mas aplicar filtro de store_id para segurança SaaS
      const { data, error } = await supabase
        .from('v_painel_cozinha')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filtro preventivo no frontend: apenas o que não está pronto
      const pendentes = (data || []).filter((p: any) => p.status !== 'pronto' && p.status !== 'cancelado');
      setPedidos(pendentes);
    } catch (err: any) {
      console.error('[KDS_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchPedidos();

    const interval = setInterval(() => setNow(new Date()), 30000);

    // Escuta mudanças na tabela base para atualizar a View
    const channel = supabase
      .channel('kds_sync_global')
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
      clearInterval(interval);
    };
  }, [store?.id, fetchPedidos]);

  const handleMarkReady = async (itemId: string) => {
    // 🚀 ATUALIZAÇÃO OTIMISTA: Remove do estado local para feedback instantâneo
    setPedidos(prev => prev.filter(p => p.item_id !== itemId));

    try {
      const { error } = await supabase
        .from('comanda_itens')
        .update({ status: 'pronto' })
        .eq('id', itemId);

      if (error) throw error;
      
      toast({ title: 'Item Pronto!', description: 'O pedido foi retirado da fila de produção.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao concluir', description: err.message });
      // Rollback apenas em caso de falha real na API
      fetchPedidos();
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sincronizando Cozinha...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader title="Cozinha (KDS)" subtitle="Monitor de produção quente." />
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-primary/20 bg-primary/5 text-primary">
          <ChefHat className="h-4 w-4" /> {pedidos.length} Pedidos Pendentes
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => {
          const elapsed = differenceInMinutes(now, parseISO(p.created_at));
          const targetTime = p.prep_time_minutes || 15;
          const isLate = elapsed > targetTime;

          return (
            <Card key={p.item_id} className={`border-none shadow-xl overflow-hidden transition-all duration-300 ${isLate ? 'bg-red-50 ring-2 ring-red-500 ring-offset-2 animate-pulse' : 'bg-background'}`}>
              <div className={`px-6 py-4 flex justify-between items-center border-b ${isLate ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/30 border-muted/20'}`}>
                <div className="flex flex-col">
                  <span className={`text-2xl font-black font-headline tracking-tighter uppercase leading-none ${isLate ? 'text-red-700' : 'text-foreground'}`}>
                    Comanda #{p.comanda_numero}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-black uppercase text-primary">
                    <MapPin className="h-3 w-3" /> {p.mesa || 'Balcão'}
                  </div>
                </div>
                <div className={`flex flex-col items-end gap-1 font-black uppercase text-[10px] ${isLate ? 'text-red-600' : 'text-muted-foreground'}`}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {elapsed} min
                  </div>
                  {isLate && <Badge className="bg-red-600 text-[8px] h-4 px-1 gap-1"><AlertTriangle className="h-2 w-2" /> ATRASADO</Badge>}
                </div>
              </div>
              
              <CardContent className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className={`text-3xl font-black leading-tight uppercase tracking-tight ${isLate ? 'text-red-900' : 'text-foreground'}`}>{p.produto}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Meta: {targetTime} min</p>
                  </div>
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border transition-colors ${isLate ? 'bg-red-600 text-white border-red-700 shadow-lg' : 'bg-primary/10 text-primary border-primary/10'}`}>
                    <span className="text-4xl font-black">{p.quantidade}</span>
                  </div>
                </div>

                <Button 
                  className={`w-full h-14 font-black uppercase tracking-widest text-xs transition-all ${isLate ? 'bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200' : 'shadow-lg shadow-primary/10'}`} 
                  onClick={() => handleMarkReady(p.item_id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Pronto
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {pedidos.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px]">
            <History className="h-20 w-20 mx-auto" />
            <p className="text-xl font-black uppercase mt-4 text-foreground">Cozinha em Ordem</p>
          </div>
        )}
      </div>
    </div>
  );
}
