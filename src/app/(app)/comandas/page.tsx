'use client';

/**
 * @fileOverview Painel Geral de Comandas Eletrônicas - Sincronizado Reativamente
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Loader2, 
  ArrowRight,
  MonitorPlay
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ComandaTotalView } from '@/lib/types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandasPage() {
  const { store, updateStore } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [comandas, setComandas] = useState<ComandaTotalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // REGRA DE OURO: A listagem SEMPRE vem do banco e filtra apenas ABERTAS
  const fetchComandas = useCallback(async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('v_comandas_totais')
        .select('*')
        .eq('store_id', store.id)
        .eq('status', 'aberta') // Garantia extra de filtragem
        .order('numero', { ascending: true });

      if (error) throw error;
      setComandas(data || []);
    } catch (err: any) {
      console.error('[FETCH_COMANDAS_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    if (store?.use_comanda) {
      fetchComandas();

      // REALTIME: Escuta a tabela base para disparar o refetch
      const channel = supabase
        .channel('comandas_list_sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'comandas',
          filter: `store_id=eq.${store.id}`
        }, () => {
          console.log('[REALTIME] Comanda alterada, atualizando lista...');
          fetchComandas();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comanda_itens'
        }, () => fetchComandas())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else if (store) {
      setLoading(false);
    }
  }, [store?.id, store?.use_comanda, fetchComandas]);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await updateStore({ use_comanda: true });
      toast({ title: 'Módulo Ativado!' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao ativar' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleCreateComanda = async () => {
    if (!store?.id) return;
    const numeroStr = prompt('Número da Comanda:');
    if (!numeroStr) return;
    const numero = parseInt(numeroStr, 10);
    const mesa = prompt('Mesa/Identificação (opcional):');

    try {
      const { data, error } = await supabase
        .from('comandas')
        .insert({ store_id: store.id, numero, mesa: mesa || null })
        .select().single();
      if (error) throw error;
      router.push(`/comandas/${data.id}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar', description: err.message });
    }
  };

  if (!store?.use_comanda) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <MonitorPlay className="h-16 w-16 text-primary mx-auto" />
        <h1 className="text-4xl font-black font-headline uppercase">Comandas Eletrônicas</h1>
        <Button size="lg" onClick={handleActivate} disabled={isActivating}>
          {isActivating ? <Loader2 className="animate-spin" /> : 'Ativar Módulo'}
        </Button>
      </div>
    );
  }

  const filtered = comandas.filter(c => 
    c.numero.toString().includes(search) || (c.mesa || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Painel de Comandas">
        <Button onClick={handleCreateComanda} className="font-black uppercase text-xs">
          <Plus className="h-4 w-4 mr-2" /> Nova Comanda
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background p-4 rounded-xl border">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filtrar por número ou mesa..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-40 animate-pulse bg-muted/20" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {filtered.map(comanda => (
            <Card 
              key={comanda.comanda_id} 
              className="cursor-pointer hover:border-primary transition-all shadow-sm"
              onClick={() => router.push(`/comandas/${comanda.comanda_id}`)}
            >
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-2xl font-black">#{comanda.numero}</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase text-primary">{comanda.mesa || 'Sem mesa'}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-[9px] uppercase font-black text-muted-foreground">Consumo</p>
                  <p className="text-xl font-black text-primary">{formatCurrency(comanda.total)}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}