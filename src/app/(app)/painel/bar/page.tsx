'use client';

/**
 * @fileOverview Painel Bar (BDS) - Sync v4.0.
 * Consome a View production_snapshot.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlassWater, Clock, History, Loader2, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function BarPage() {
  const { store, marcarItemConcluido, productionQueue, refreshStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    await refreshStatus();
    setLoading(false);
  }, [refreshStatus]);

  useEffect(() => {
    fetchPedidos();
    const channel = supabase
      .channel('bds_v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => fetchPedidos())
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [fetchPedidos]);

  const handleConcluir = async (itemId: string) => {
    try {
      await marcarItemConcluido(itemId);
      toast({ title: 'Bebida Servida!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao concluir', description: err.message });
    }
  };

  const filteredItems = productionQueue.filter(p => p.destino_preparo === 'bar');

  if (loading && productionQueue.length === 0) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-cyan-600 h-8 w-8" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground animate-pulse">Sincronizando Bar...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader title="Bar (BDS)" subtitle="Monitor de bebidas v4.0." />
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-cyan-200 bg-cyan-50 text-cyan-600">
          <GlassWater className="h-4 w-4 text-cyan-600" /> {filteredItems.length} Drinks
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map(p => (
          <Card key={p.item_id} className="border-none shadow-xl overflow-hidden bg-background animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 flex justify-between items-center border-b bg-cyan-500/5 border-cyan-500/10">
              <div className="flex flex-col">
                <span className="text-xl font-black font-headline uppercase leading-none">Mesa {p.mesa || 'Balcão'}</span>
                <span className="text-[9px] font-bold text-cyan-600 uppercase mt-1">Ref: {p.sale_number}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatDistanceToNow(parseISO(p.created_at), { locale: ptBR })}
              </div>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <p className="text-3xl font-black leading-tight uppercase tracking-tight text-cyan-700">{p.produto}</p>
                <div className="h-16 w-16 rounded-2xl bg-cyan-50 flex items-center justify-center text-4xl font-black text-cyan-600 border border-cyan-100 shadow-inner">
                  {p.qty}
                </div>
              </div>
              <Button 
                className="w-full h-16 font-black uppercase text-xs tracking-widest bg-cyan-600 hover:bg-cyan-700 shadow-xl shadow-cyan-600/20 transition-all active:scale-95" 
                onClick={() => handleConcluir(p.item_id)}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" /> Confirmar Entrega
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px] border-cyan-100 font-black uppercase tracking-[0.3em]">
            <History className="h-20 w-20 mx-auto mb-4 text-cyan-600" />
            Bar em Ordem
          </div>
        )}
      </div>
    </div>
  );
}
