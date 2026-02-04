
'use client';

/**
 * @fileOverview Painel Bar (BDS)
 * 
 * Utiliza a view v_painel_bar sincronizada com o backend final.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlassWater, Clock, History, Loader2, MapPin, CheckCircle2, Play } from 'lucide-react';
import { parseISO, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { PainelProducaoView } from '@/lib/types';

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
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(() => {
      fetchPedidos();
      setNow(new Date());
    }, 30000);

    const channel = supabase
      .channel('bds_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => fetchPedidos())
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchPedidos]);

  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      let error;
      if (newStatus === 'em_preparo') {
        const res = await supabase.rpc('iniciar_preparo_item', { p_item_id: itemId });
        error = res.error;
      } else {
        const res = await supabase.rpc('finalizar_preparo_item', { p_item_id: itemId });
        error = res.error;
      }

      if (error) throw error;
      toast({ title: newStatus === 'pronto' ? 'Bebida servida!' : 'Em preparo!' });
      fetchPedidos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha na Operação', description: err.message });
    }
  };

  if (loading && pedidos.length === 0) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest opacity-50">Sincronizando Bar...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader title="Bar (BDS)" subtitle="Monitor de bebidas e drinks." />
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-cyan-200 bg-cyan-50 text-cyan-600">
          <GlassWater className="h-4 w-4" /> {pedidos.length} Pedidos Pendentes
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => {
          const elapsed = differenceInMinutes(now, parseISO(p.created_at));
          const isLate = elapsed >= 10;

          return (
            <Card key={p.item_id} className={`border-none shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 ${isLate ? 'ring-2 ring-red-500' : ''}`}>
              <div className={`px-6 py-4 flex justify-between items-center border-b ${isLate ? 'bg-red-500 text-white' : 'bg-cyan-500/5 border-cyan-500/10'}`}>
                <div className="flex flex-col">
                  <span className="text-xl font-black font-headline tracking-tighter uppercase leading-none">Comanda #{p.comanda_numero}</span>
                  <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] font-black uppercase ${isLate ? 'text-white/80' : 'text-cyan-600'}`}>
                    <MapPin className="h-3 w-3" /> {p.mesa || 'Sem mesa'}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                  <Clock className="h-3 w-3" /> {elapsed} min
                </div>
              </div>
              
              <CardContent className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <p className="text-3xl font-black leading-tight uppercase tracking-tight text-cyan-700">{p.produto}</p>
                  <div className="h-16 w-16 rounded-2xl bg-cyan-50 flex items-center justify-center text-4xl font-black text-cyan-600 border border-cyan-100">
                    {p.qty}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {p.status === 'pendente' ? (
                    <Button variant="outline" className="w-full h-14 font-black uppercase text-xs border-cyan-200 text-cyan-700" onClick={() => handleStatusUpdate(p.item_id, 'em_preparo')}>
                      <Play className="h-4 w-4 mr-2" /> Iniciar
                    </Button>
                  ) : (
                    <Button className="w-full h-14 font-black uppercase text-xs bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-600/20" onClick={() => handleStatusUpdate(p.item_id, 'pronto')}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {pedidos.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px] border-muted">
            <History className="h-20 w-20 mx-auto text-cyan-600" />
            <p className="text-xl font-black uppercase mt-4 text-foreground">Bar em Ordem</p>
          </div>
        )}
      </div>
    </div>
  );
}
