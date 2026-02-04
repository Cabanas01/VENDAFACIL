
'use client';

/**
 * @fileOverview Painel Cozinha (KDS)
 * 
 * Utiliza sale_items como base de produção conforme o schema real.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, History, Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function CozinhaPage() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
    if (!store?.id) return;
    try {
      // Query em sale_items filtrando por destino 'cozinha' e status pendente/preparo
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          id,
          product_name_snapshot,
          quantity,
          status,
          created_at,
          sales!inner (
            store_id,
            comandas!inner (
              numero,
              mesa
            )
          )
        `)
        .eq('sales.store_id', store.id)
        .eq('destino_preparo', 'cozinha')
        .in('status', ['pendente', 'em_preparo'])
        .order('created_at', { ascending: true });

      if (!error) setPedidos(data || []);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 30000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  const handleConcluir = async (itemId: string) => {
    const { error } = await supabase.from('sale_items').update({ status: 'pronto' }).eq('id', itemId);
    if (!error) {
      toast({ title: 'Item Pronto!' });
      fetchPedidos();
    }
  };

  if (loading && pedidos.length === 0) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest opacity-50">Sincronizando Cozinha...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <PageHeader title="Cozinha" subtitle="Monitor de produção em tempo real.">
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs">
          <ChefHat className="h-4 w-4 text-primary" /> {pedidos.length} Pedidos
        </Badge>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => (
          <Card key={p.id} className="border-none shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 flex justify-between items-center border-b bg-muted/30">
              <div className="flex flex-col">
                <span className="text-xl font-black uppercase tracking-tighter">Comanda #{p.sales?.comandas?.numero}</span>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black uppercase text-primary">
                  <MapPin className="h-3 w-3" /> {p.sales?.comandas?.mesa || 'Balcão'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatDistanceToNow(parseISO(p.created_at), { locale: ptBR })}
              </div>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <p className="text-3xl font-black leading-tight uppercase tracking-tight">{p.product_name_snapshot}</p>
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl font-black text-primary">
                  {p.quantity}
                </div>
              </div>
              <Button className="w-full h-14 font-black uppercase tracking-widest text-xs" onClick={() => handleConcluir(p.id)}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir Preparo
              </Button>
            </CardContent>
          </Card>
        ))}

        {pedidos.length === 0 && (
          <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px] border-muted">
            <History className="h-20 w-20 mx-auto" />
            <p className="text-xl font-black uppercase mt-4 text-foreground">Fila Limpa</p>
          </div>
        )}
      </div>
    </div>
  );
}
