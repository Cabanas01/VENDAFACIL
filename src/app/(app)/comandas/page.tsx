'use client';

/**
 * @fileOverview Painel Geral de Comandas - Versão Operacional Mesa/Cliente
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Loader2, 
  ArrowRight,
  MonitorPlay,
  Users,
  MapPin,
  ClipboardCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
  const [isNewComandaOpen, setIsNewComandaOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newComanda, setNewComanda] = useState({ numero: '', mesa: '', cliente: '' });

  const fetchComandas = useCallback(async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('v_comandas_totais')
        .select('*')
        .eq('store_id', store.id)
        .eq('status', 'aberta')
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

      const channel = supabase
        .channel('comandas_list_sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'comandas',
          filter: `store_id=eq.${store.id}`
        }, () => fetchComandas())
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
      toast({ title: 'Módulo de Comandas Ativado!' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao ativar módulo' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleCreateComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id || !newComanda.numero) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comandas')
        .insert({ 
          store_id: store.id, 
          numero: parseInt(newComanda.numero, 10), 
          mesa: newComanda.mesa || null,
          cliente_nome: newComanda.cliente || null
        })
        .select().single();

      if (error) throw error;
      
      setIsNewComandaOpen(false);
      setNewComanda({ numero: '', mesa: '', cliente: '' });
      router.push(`/comandas/${data.id}`);
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao criar comanda', 
        description: err.message.includes('unique') ? 'Este número de comanda já está em uso.' : err.message 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!store?.use_comanda) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="p-6 bg-primary/5 rounded-full w-fit mx-auto ring-8 ring-primary/5">
          <MonitorPlay className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline uppercase tracking-tighter">Comandas Eletrônicas</h1>
          <p className="text-muted-foreground max-w-md mx-auto">Gerencie pedidos de mesas, bar e cozinha com sincronização em tempo real.</p>
        </div>
        <Button size="lg" onClick={handleActivate} disabled={isActivating} className="h-14 px-10 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
          {isActivating ? <Loader2 className="animate-spin mr-2" /> : <ClipboardCheck className="mr-2 h-5 w-5" />}
          Ativar Agora
        </Button>
      </div>
    );
  }

  const filtered = comandas.filter(c => 
    c.numero.toString().includes(search) || 
    (c.mesa || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cliente_nome || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Comandas Abertas">
        <Button onClick={() => setIsNewComandaOpen(true)} className="h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Abrir Comanda
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border border-primary/5 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por número, mesa ou cliente..." 
          className="border-none shadow-none focus-visible:ring-0 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
              className="group cursor-pointer hover:border-primary transition-all shadow-sm border-primary/5 bg-background relative overflow-hidden"
              onClick={() => router.push(`/comandas/${comanda.comanda_id}`)}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="bg-muted/20 border-b py-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-3xl font-black tracking-tighter">#{comanda.numero}</CardTitle>
                  <Badge variant="outline" className="text-[8px] font-black uppercase bg-background border-primary/20">Aberta</Badge>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary">
                    <MapPin className="h-3 w-3" /> {comanda.mesa || 'Sem mesa'}
                  </div>
                  {comanda.cliente_nome && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                      <Users className="h-3 w-3" /> {comanda.cliente_nome}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 pb-4">
                <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Consumo Atual</p>
                <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(comanda.total)}</p>
              </CardContent>
              <CardFooter className="pt-0 pb-4 flex justify-end">
                <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  Gerenciar <ArrowRight className="h-3 w-3" />
                </span>
              </CardFooter>
            </Card>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-30">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">Nenhuma comanda aberta</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NOVA COMANDA */}
      <Dialog open={isNewComandaOpen} onOpenChange={setIsNewComandaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Iniciar Comanda</DialogTitle>
            <DialogDescription className="font-medium">Identifique o pedido para a equipe de produção.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateComanda} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número do Cartão/Comanda *</label>
                <Input 
                  type="number" 
                  placeholder="Ex: 10" 
                  required 
                  value={newComanda.numero}
                  onChange={e => setNewComanda({...newComanda, numero: e.target.value})}
                  className="h-12 text-lg font-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mesa / Setor</label>
                  <Input 
                    placeholder="Ex: 25" 
                    value={newComanda.mesa}
                    onChange={e => setNewComanda({...newComanda, mesa: e.target.value})}
                    className="h-12 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Cliente</label>
                  <Input 
                    placeholder="Ex: João" 
                    value={newComanda.cliente}
                    onChange={e => setNewComanda({...newComanda, cliente: e.target.value})}
                    className="h-12 font-bold"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsNewComandaOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="h-12 px-8 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Abrir e Iniciar Pedido'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
