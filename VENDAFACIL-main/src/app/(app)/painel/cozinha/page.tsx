'use client';

/**
 * @fileOverview Painel Cozinha (KDS).
 * Consome exclusivamente a View production_snapshot.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, History, Loader2, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ProductionSnapshotView } from '@/lib/types';

export default function CozinhaPage() {
  const { store, marcarItemConcluido } = useAuth();
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<ProductionSnapshotView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('production_snapshot')
        .select('*')
        .eq('destino_preparo', 'cozinha')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPedidos(data || []);
    } catch (err) {
      console.error('[KDS_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchPedidos();
    const channel = supabase
      .channel('kds_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => fetchPedidos())
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [fetchPedidos]);

  const handleConcluir = async (itemId: string) => {
    try {
      await marcarItemConcluido(itemId);
      toast({ title: 'Prato Liberado!' });
      await fetchPedidos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  if (loading && pedidos.length === 0) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <Loader2 className="animate-spin text-primary h-8 w-8" />
      <p className="font-black uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Cozinha...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader title="Cozinha (KDS)" subtitle="Produção em tempo real." />
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-primary/20 bg-primary/5 text-primary">
          <ChefHat className="h-4 w-4 text-primary" /> {pedidos.length} Pedidos Pendentes
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => (
          <Card key={p.item_id} className="border-none shadow-xl overflow-hidden bg-background animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 flex justify-between items-center border-b bg-muted/30">
              <div className="flex flex-col">
                <span className="text-xl font-black font-headline uppercase leading-none">Mesa {p.mesa || 'Balcão'}</span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Ref: {p.sale_id.substring(0,8)}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatDistanceToNow(parseISO(p.created_at), { locale: ptBR })}
              </div>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <p className="text-3xl font-black leading-tight uppercase tracking-tight">{p.produto}</p>
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl font-black text-primary border border-primary/10 shadow-inner">
                  {p.qty}
                </div>
              </div>
              <Button 
                className="w-full h-16 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95" 
                onClick={() => handleConcluir(p.item_id)}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" /> Liberar Produção
              </Button>
            </CardContent>
          </Card>
        ))}

        {pedidos.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px] font-black uppercase tracking-[0.3em]">
            <ChefHat className="h-20 w-20 mx-auto mb-4" />
            Cozinha Limpa
          </div>
        )}
      </div>
    </div>
  );
}
