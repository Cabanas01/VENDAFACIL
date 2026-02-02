'use client';

/**
 * @fileOverview KDS - Painel de Cozinha
 * 
 * Interface focada em produção, consumindo a view v_painel_cozinha.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat, 
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

export default function CozinhaPage() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<PainelProducaoView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('v_painel_cozinha')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPedidos(data || []);
    } catch (err: any) {
      console.error('[KDS_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
    
    // Realtime: Atualiza quando itens de comanda mudam
    const channel = supabase
      .channel('kds_cozinha')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens' }, () => fetchPedidos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [store?.id]);

  const handleStatusChange = async (itemId: string, status: string) => {
    try {
      const { error } = await supabase.rpc('atualizar_status_comanda', {
        p_item_id: itemId,
        p_novo_status: status
      });

      if (error) throw error;
      toast({ title: 'Status Atualizado!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha', description: err.message });
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sincronizando Cozinha...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <PageHeader title="Cozinha" subtitle="Fila de pedidos para preparo quente." />
        <Badge variant="outline" className="h-10 px-4 gap-2 bg-primary/5 border-primary/10 text-primary font-black uppercase text-xs">
          <ChefHat className="h-4 w-4" /> {pedidos.length} Pendentes
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map(p => (
          <Card key={p.id} className={cn(
            "border-none shadow-xl overflow-hidden transition-all duration-500",
            p.status_item === 'em_preparo' ? 'ring-2 ring-orange-500' : 'bg-background'
          )}>
            <div className={cn(
              "px-6 py-4 flex justify-between items-center border-b",
              p.status_item === 'em_preparo' ? 'bg-orange-500/10' : 'bg-muted/30'
            )}>
              <span className="text-2xl font-black font-headline tracking-tighter">COMANDA #{p.numero_comanda}</span>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatDistanceToNow(parseISO(p.created_at), { locale: ptBR, addSuffix: false })}
              </div>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-3xl font-black leading-tight uppercase tracking-tight">{p.nome_produto}</p>
                  {p.mesa_cliente && <p className="text-xs font-bold text-muted-foreground">Mesa/Ref: {p.mesa_cliente}</p>}
                </div>
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                  <span className="text-4xl font-black">{p.quantidade}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                {p.status_item === 'pendente' ? (
                  <Button 
                    className="flex-1 h-16 text-xs font-black uppercase tracking-widest bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => handleStatusChange(p.id, 'em_preparo')}
                  >
                    <Play className="h-4 w-4 mr-2" /> Iniciar Preparo
                  </Button>
                ) : (
                  <Button 
                    className="flex-1 h-16 text-xs font-black uppercase tracking-widest bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => handleStatusChange(p.id, 'pronto')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Pronto
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {pedidos.length === 0 && (
          <div className="col-span-full py-40 text-center space-y-6 opacity-20 border-4 border-dashed rounded-[40px]">
            <History className="h-20 w-20 mx-auto" />
            <div className="space-y-1">
              <p className="text-xl font-black uppercase tracking-tighter">Cozinha Limpa</p>
              <p className="text-sm font-bold uppercase tracking-widest">Aguardando novos pedidos do salão...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
