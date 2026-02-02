'use client';

/**
 * @fileOverview Painel Geral de Comandas Eletrônicas - Sincronizado com RLS
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

  const fetchComandas = useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    try {
      // RLS valida store_id via token JWT do usuário logado
      const { data, error } = await supabase
        .from('v_comandas_totais')
        .select('*')
        .eq('store_id', store.id)
        .order('numero', { ascending: true });

      if (error) throw error;
      setComandas(data || []);
    } catch (err: any) {
      console.error('[FETCH_COMANDAS]', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    if (store?.use_comanda) {
      fetchComandas();

      const channel = supabase
        .channel('comandas_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas', filter: `store_id=eq.${store.id}` }, () => fetchComandas())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens' }, () => fetchComandas())
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
      toast({ title: 'Módulo Ativado!', description: 'Você já pode começar a usar comandas eletrônicas.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao ativar' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleCreateComanda = async () => {
    if (!store?.id) return;
    
    const numeroStr = prompt('Digite o número da nova comanda (ex: 10):');
    if (!numeroStr) return;
    
    const numero = parseInt(numeroStr, 10);
    if (isNaN(numero)) {
      toast({ variant: 'destructive', title: 'Número inválido' });
      return;
    }

    const mesa = prompt('Digite a mesa ou identificação (opcional):');

    try {
      // RLS garante que store_id pertença ao usuário
      // Campo 'status' assume default 'aberta' no banco
      const { data, error } = await supabase
        .from('comandas')
        .insert({
          store_id: store.id,
          numero: numero,
          mesa: mesa || null
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/comandas/${data.id}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar', description: err.message });
    }
  };

  if (!store?.use_comanda) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="mx-auto bg-primary/10 p-6 rounded-full w-fit">
          <MonitorPlay className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black font-headline uppercase tracking-tighter">Comandas Eletrônicas</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-medium">
            Controle o consumo de mesas e clientes de forma digital e integrada à cozinha.
          </p>
        </div>
        <Button size="lg" className="h-16 px-10 font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={handleActivate} disabled={isActivating}>
          {isActivating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Ativar Módulo de Comandas'}
        </Button>
      </div>
    );
  }

  const filtered = comandas.filter(c => 
    c.numero.toString().includes(search) || 
    (c.mesa || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Painel de Comandas" subtitle="Gerenciamento em tempo real das mesas e consumos.">
        <Button onClick={handleCreateComanda} className="h-12 font-black uppercase tracking-widest shadow-lg shadow-primary/10">
          <Plus className="h-4 w-4 mr-2" /> Nova Comanda
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-primary/5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar por número da comanda ou mesa..." 
            className="pl-10 h-12 text-sm font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="h-12 px-4 font-black uppercase text-[10px] border-primary/10 bg-primary/5 text-primary">
          {filtered.length} Comandas Abertas
        </Badge>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-48 animate-pulse bg-muted/20 border-none" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {filtered.map(comanda => (
            <Card 
              key={comanda.comanda_id} 
              className="group cursor-pointer hover:border-primary transition-all active:scale-95 shadow-sm overflow-hidden border-border/50"
              onClick={() => router.push(`/comandas/${comanda.comanda_id}`)}
            >
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-black font-headline tracking-tighter">#{comanda.numero}</CardTitle>
                    {comanda.mesa && (
                      <CardDescription className="text-[10px] uppercase font-black tracking-widest mt-1 text-primary">
                        Local: {comanda.mesa}
                      </CardDescription>
                    )}
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] font-black uppercase">Ativa</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Total Acumulado</p>
                  <p className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(comanda.total)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filtered.length === 0 && (
            <div className="col-span-full py-32 text-center space-y-4 opacity-20 border-2 border-dashed rounded-3xl">
              <ClipboardList className="h-12 w-12 mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhuma comanda localizada.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
