'use client';

/**
 * @fileOverview BDS - Painel de Bar (Sincronizado)
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GlassWater, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  Play,
  History
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { PainelProducaoView } from '@/lib/types';

export default function BarPage() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<PainelProducaoView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('v_painel_bar')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPedidos(data || []);
    } catch (err: any) {
      console.error('[BDS_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
    const channel = supabase
      .channel('bds_bar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens' }, () => fetchPedidos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [store?.id]);

  const handleStatusChange = async (itemId: string, novoStatus: string) => {
    try {
      const { error } = await supabase.rpc('atualizar_status_comanda', {
        p_item_id: itemId,
        p_novo_status: novoStatus
      });

      if (error) throw error;
      toast({ title: 'Bebida Pronta!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha ao atualizar' });
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest">Sincronizando Bar...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <PageHeader title="Bar" subtitle="Pedidos de bebidas e coquetéis." />
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs">
          <GlassWater className="h-4 w-4 text-cyan-600" /> {pedidos.length} Drinks
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => (
          <Card key={p.item_id} className={cn(
            "border-none shadow-xl overflow-hidden transition-all",
            p.status === 'em_preparo' ? 'ring-2 ring-cyan-500' : ''
          )}>
            <div className={cn(
              "px-6 py-4 flex justify-between items-center border-b",
              p.status === 'em_preparo' ? 'bg-cyan-500/10' : 'bg-muted/30'
            )}>
              <span className="text-2xl font-black font-headline tracking-tighter">COMANDA #{p.comanda_numero}</span>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatDistanceToNow(parseISO(p.created_at), { locale: ptBR })}
              </div>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-3xl font-black leading-tight uppercase tracking-tight text-cyan-700">{p.product_name}</p>
                  {p.mesa && <p className="text-xs font-bold text-muted-foreground">Mesa: {p.mesa}</p>}
                </div>
                <div className="h-16 w-16 rounded-2xl bg-cyan-50 flex items-center justify-center border border-cyan-100">
                  <span className="text-4xl font-black text-cyan-600">{p.quantidade}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                {p.status === 'pendente' ? (
                  <Button 
                    className="flex-1 h-16 text-xs font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => handleStatusChange(p.item_id, 'em_preparo')}
                  >
                    <Play className="h-4 w-4 mr-2" /> Iniciar
                  </Button>
                ) : (
                  <Button 
                    className="flex-1 h-16 text-xs font-black uppercase tracking-widest bg-green-500 hover:bg-green-600"
                    onClick={() => handleStatusChange(p.item_id, 'pronto')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Pronto
                  </Button>
                )}
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}