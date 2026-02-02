'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlassWater, Clock, History, Loader2, MapPin } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PainelProducaoView } from '@/lib/types';

export default function BarPage() {
  const { store } = useAuth();
  const [pedidos, setPedidos] = useState<PainelProducaoView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('v_painel_bar')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPedidos(data || []);
    } catch (err) {
      console.error('[BDS_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchPedidos();

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
        table: 'comandas',
        filter: `store_id=eq.${store?.id}`
      }, () => fetchPedidos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [store?.id, fetchPedidos]);

  if (loading) return <div className="h-[60vh] flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-primary" /><p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sincronizando Bar...</p></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader title="Bar (BDS)" subtitle="Monitor de bebidas e drinks." />
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-cyan-200 bg-cyan-50">
          <GlassWater className="h-4 w-4 text-cyan-600" /> {pedidos.length} Drinks
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => (
          <Card key={p.item_id} className="border-none shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 flex justify-between items-center border-b bg-cyan-500/5">
              <div className="flex flex-col">
                <span className="text-2xl font-black font-headline tracking-tighter uppercase leading-none">Comanda #{p.comanda_numero}</span>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-black uppercase text-cyan-600">
                  <MapPin className="h-3 w-3" /> {p.mesa || 'Sem mesa'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatDistanceToNow(parseISO(p.created_at), { locale: ptBR })}
              </div>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <p className="text-3xl font-black leading-tight uppercase tracking-tight text-cyan-700">{p.produto}</p>
                <div className="h-16 w-16 rounded-2xl bg-cyan-50 flex items-center justify-center border border-cyan-100">
                  <span className="text-4xl font-black text-cyan-600">{p.quantidade}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {pedidos.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px]">
            <History className="h-20 w-20 mx-auto" />
            <p className="text-xl font-black uppercase mt-4">Bar em Ordem</p>
          </div>
        )}
      </div>
    </div>
  );
}
