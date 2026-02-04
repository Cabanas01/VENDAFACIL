
'use client';

/**
 * @fileOverview Painel Cozinha (KDS).
 * Consome estritamente a view v_painel_cozinha.
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
import type { PainelProducaoView } from '@/lib/types';

export default function CozinhaPage() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<PainelProducaoView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
    if (!store?.id) return;
    const { data } = await supabase.from('v_painel_cozinha').select('*').eq('store_id', store.id);
    setPedidos(data || []);
    setLoading(false);
  }, [store?.id]);

  useEffect(() => {
    fetchPedidos();
    const channel = supabase.channel('kds_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => fetchPedidos()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPedidos]);

  const handleStatus = async (itemId: string, action: 'iniciar' | 'finalizar') => {
    const rpc = action === 'iniciar' ? 'iniciar_preparo_item' : 'finalizar_preparo_item';
    const { error } = await supabase.rpc(rpc, { p_item_id: itemId });
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else fetchPedidos();
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader title="Cozinha" subtitle="Produção em tempo real." />
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-primary/20 bg-primary/5 text-primary">
          <ChefHat className="h-4 w-4" /> {pedidos.length} Pedidos
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => (
          <Card key={p.item_id} className="border-none shadow-xl overflow-hidden bg-background">
            <div className={`px-6 py-4 flex justify-between items-center border-b ${p.status === 'em_preparo' ? 'bg-orange-50 border-orange-100' : 'bg-muted/30'}`}>
              <span className="text-xl font-black font-headline uppercase leading-none">Mesa {p.mesa || '??'}</span>
              <Badge variant="secondary" className="text-[8px] uppercase font-black">{p.status}</Badge>
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between">
                <p className="text-3xl font-black leading-tight uppercase">{p.produto}</p>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-black text-primary">{p.qty}</div>
              </div>
              <div className="flex gap-2">
                {p.status === 'pendente' && (
                  <Button className="w-full h-14 font-black uppercase text-xs" variant="outline" onClick={() => handleStatus(p.item_id, 'iniciar')}>Iniciar</Button>
                )}
                <Button className="w-full h-14 font-black uppercase text-xs shadow-lg shadow-primary/20" onClick={() => handleStatus(p.item_id, 'finalizar')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pedidos.length === 0 && <div className="col-span-full py-40 text-center opacity-20 border-4 border-dashed rounded-[40px] font-black uppercase">Fila Vazia</div>}
      </div>
    </div>
  );
}
