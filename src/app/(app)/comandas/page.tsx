'use client';

/**
 * @fileOverview Painel Geral de Comandas Eletrônicas
 * 
 * Implementa visualização de todas as comandas abertas e onboarding condicional.
 */

import { useEffect, useState } from 'react';
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
  Coffee, 
  Trash2, 
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

  const fetchComandas = async () => {
    if (!store?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_comandas_totais')
        .select('*')
        .eq('store_id', store.id)
        .order('numero_comanda', { ascending: true });

      if (error) throw error;
      setComandas(data || []);
    } catch (err: any) {
      console.error('[FETCH_COMANDAS]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (store?.use_comanda) {
      fetchComandas();

      // Realtime subscription
      const channel = supabase
        .channel('comandas_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, () => fetchComandas())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens' }, () => fetchComandas())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [store?.id, store?.use_comanda]);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await updateStore({ use_comanda: true });
      toast({ title: 'Módulo Ativado!', description: 'Você já pode começar a usar comandas eletrônicas.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao ativar', description: 'Não foi possível ativar o módulo agora.' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleCreateComanda = async () => {
    if (!store?.id) return;
    
    const numero = prompt('Digite o número da comanda ou mesa:');
    if (!numero) return;

    try {
      // Corrigido: Removido mesa_cliente da inserção pois a coluna não existe na tabela base 'comandas'
      const { data, error } = await supabase
        .from('comandas')
        .insert({
          store_id: store.id,
          numero_comanda: numero,
          status: 'aberta'
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/comandas/${data.id}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar comanda', description: err.message });
    }
  };

  // Se a loja não usa comanda, mostra tela de onboarding
  if (!store?.use_comanda) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="mx-auto bg-primary/10 p-6 rounded-full w-fit ring-8 ring-primary/5">
          <MonitorPlay className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase font-headline">Comandas Eletrônicas</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-medium leading-relaxed">
            Elimine erros de anotação e filas no balcão. Controle o consumo de mesas e clientes de forma digital e integrada à cozinha.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 text-left">
          <BenefitCard icon={<ChefHat className="text-primary"/>} title="Integração Cozinha" desc="Envie pedidos direto para o preparo." />
          <BenefitCard icon={<Coffee className="text-primary"/>} title="Controle de Mesas" desc="Gerencie o consumo por número ou mesa." />
          <BenefitCard icon={<ClipboardList className="text-primary"/>} title="Cálculo Automático" desc="O total é atualizado a cada novo item." />
        </div>
        <Button size="lg" className="h-16 px-10 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={handleActivate} disabled={isActivating}>
          {isActivating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Ativar Agora Gratuitamente'}
        </Button>
      </div>
    );
  }

  const filtered = comandas.filter(c => 
    c.numero_comanda.toLowerCase().includes(search.toLowerCase()) || 
    (c.mesa_cliente || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Painel de Comandas" subtitle="Gerenciamento em tempo real do consumo das mesas.">
        <Button onClick={handleCreateComanda} className="h-12 font-black uppercase tracking-widest">
          <Plus className="h-4 w-4 mr-2" /> Nova Comanda
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-primary/5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar comanda ou mesa..." 
            className="pl-10 h-12 text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="h-12 px-4 font-black uppercase text-[10px]">
          {filtered.length} Ativas
        </Badge>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-48 animate-pulse bg-muted/20" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {filtered.map(comanda => (
            <Card 
              key={comanda.id} 
              className="group cursor-pointer hover:border-primary transition-all active:scale-95 shadow-sm overflow-hidden"
              onClick={() => router.push(`/comandas/${comanda.id}`)}
            >
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-black font-headline tracking-tighter">#{comanda.numero_comanda}</CardTitle>
                    {comanda.mesa_cliente && (
                      <CardDescription className="text-[10px] uppercase font-black tracking-widest mt-1">
                        Ref: {comanda.mesa_cliente}
                      </CardDescription>
                    )}
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] font-black uppercase">Aberta</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Consumo Atual</p>
                    <p className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(comanda.total_cents)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filtered.length === 0 && (
            <div className="col-span-full py-32 text-center space-y-4 opacity-20 border-2 border-dashed rounded-3xl">
              <ClipboardList className="h-12 w-12 mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhuma comanda aberta no momento.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BenefitCard({ icon, title, desc }: any) {
  return (
    <div className="p-6 bg-background rounded-2xl border border-primary/5 shadow-sm space-y-2">
      <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2">{icon}</div>
      <h3 className="font-black uppercase text-[11px] tracking-widest">{title}</h3>
      <p className="text-xs text-muted-foreground font-medium">{desc}</p>
    </div>
  );
}

function ChefHat(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chef-hat"><path d="M17 21h-10"/><path d="M6 13h12"/><path d="M6 13a4 4 0 1 1 0-8c1.35 0 2.2.6 3 1.5 1.2 1.5 3.3 1.5 4.5 0 .8-.9 1.65-1.5 3-1.5a4 4 0 1 1 0 8Z"/><path d="M18 13v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1"/></svg>
  );
}
