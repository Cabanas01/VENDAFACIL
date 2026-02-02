'use client';

/**
 * @fileOverview Detalhes da Comanda (Visão de Atendimento)
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  User,
  MapPin,
  CreditCard,
  Send,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ComandaItem, Product, ComandaTotalView, Customer } from '@/lib/types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandaDetailsPage() {
  const { id } = useParams();
  const { products, refreshStatus, store } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comanda, setComanda] = useState<ComandaTotalView | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<ComandaItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pedido temporário (Rascunho)
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [tempItems, setTempItems] = useState<{ product: Product; quantity: number }[]>([]);
  
  // Fechamento
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !store?.id) return;
    try {
      const [comandaRes, itemsRes] = await Promise.all([
        supabase.from('v_comandas_totais').select('*').eq('comanda_id', id).maybeSingle(),
        supabase.from('comanda_itens').select('*').eq('comanda_id', id).order('created_at', { ascending: false })
      ]);

      if (!comandaRes.data || comandaRes.data.status !== 'aberta') {
        router.replace('/comandas');
        return;
      }

      setComanda(comandaRes.data);
      setItems(itemsRes.data || []);

      // Busca dados do cliente via customer_id
      const { data: baseComanda } = await supabase.from('comandas').select('customer_id').eq('id', id).single();
      if (baseComanda?.customer_id) {
        const { data: custData } = await supabase.from('customers').select('*').eq('id', baseComanda.customer_id).single();
        setCustomer(custData);
      }
    } catch (err) {
      console.error('[FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [id, store?.id, router]);

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel(`sync_comanda_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens', filter: `comanda_id=eq.${id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchData]);

  const addTempItem = (product: Product) => {
    setTempItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const confirmOrder = async () => {
    if (tempItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const inserts = tempItems.map(i => ({
        comanda_id: id as string,
        product_id: i.product.id,
        product_name: i.product.name,
        quantidade: i.quantity,
        preco_unitario: i.product.price_cents,
        destino_preparo: i.product.destino_preparo || 'nenhum'
      }));

      const { error } = await supabase.from('comanda_itens').insert(inserts);
      if (error) throw error;

      toast({ title: 'Pedido Enviado!', description: 'Itens foram para cozinha/bar.' });
      setTempItems([]);
      setIsAdding(false);
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseComanda = async (method: 'cash' | 'pix' | 'card') => {
    if (!comanda?.total || comanda.total <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('fechar_comanda', {
        p_comanda_id: id as string,
        p_payment_method: method
      });

      if (error) throw error;
      
      await refreshStatus(); 
      toast({ title: 'Comanda Encerrada!', description: 'Venda registrada no sistema.' });
      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao fechar', description: err.message });
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/comandas')} className="h-10 w-10 p-0 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter uppercase">Comanda #{comanda?.numero}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black text-[10px] uppercase">
                Status: Aberta
              </Badge>
              <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {comanda?.mesa || 'Balcão'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-background p-4 rounded-2xl border border-primary/10 shadow-sm flex flex-col items-end">
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total do Consumo</p>
          <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(comanda?.total || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</p>
                  <p className="font-bold text-sm">{customer?.name || comanda?.cliente_nome || 'Consumidor'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground">{customer?.phone || '—'}</p>
                <p className="text-[9px] text-muted-foreground font-mono">{customer?.cpf || '—'}</p>
              </div>
            </CardContent>
          </Card>

          {tempItems.length > 0 && (
            <Card className="border-primary bg-primary/5 shadow-lg animate-in slide-in-from-top-2">
              <CardHeader className="py-3 border-b border-primary/10">
                <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2">
                  <Plus className="h-3 w-3" /> Itens a Enviar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {tempItems.map(i => (
                  <div key={i.product.id} className="flex justify-between items-center font-bold text-sm">
                    <span>{i.product.name} <Badge variant="secondary" className="ml-2">x{i.quantity}</Badge></span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTempItems(prev => prev.filter(x => x.product.id !== i.product.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button className="w-full h-12 font-black uppercase tracking-widest" onClick={confirmOrder} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                  Confirmar e Enviar para Preparo
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row justify-between items-center bg-muted/10 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Consumo Registrado</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(true)} className="h-8 font-black uppercase text-[10px]">
                <Plus className="h-3 w-3 mr-1" /> Add Itens
              </Button>
            </CardHeader>
            <div className="overflow-hidden rounded-b-xl">
              <Table>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/5 transition-colors border-b border-muted/10">
                      <TableCell className="font-bold py-4">
                        <div className="flex flex-col">
                          <span>{item.product_name}</span>
                          <span className="text-[9px] font-black uppercase text-muted-foreground mt-0.5">
                            Preparado em: {item.destino_preparo || 'balcão'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs">x{item.quantidade}</TableCell>
                      <TableCell className="text-right font-black text-primary">
                        {formatCurrency(item.quantidade * item.preco_unitario)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-20 text-center text-muted-foreground italic text-sm">
                        Nenhum item lançado nesta comanda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-2xl overflow-hidden sticky top-24">
            <CardHeader className="bg-primary/10 text-center py-6">
              <CardTitle className="text-lg font-black uppercase tracking-tighter text-primary">Ações de Conta</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-1 py-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total a Receber</p>
                <p className="text-4xl font-black text-foreground tracking-tighter">{formatCurrency(comanda?.total || 0)}</p>
              </div>
              
              <Button 
                className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95" 
                onClick={() => setIsClosing(true)}
                disabled={!comanda?.total || comanda.total <= 0 || tempItems.length > 0}
              >
                <CheckCircle2 className="h-6 w-6 mr-2" /> Fechar Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-widest">Cardápio de Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Buscar produto..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="h-12"
              autoFocus
            />
            <ScrollArea className="h-96 pr-4">
              <div className="grid grid-cols-2 gap-2">
                {products
                  .filter(p => p.active && p.name.toLowerCase().includes(search.toLowerCase()))
                  .map(p => (
                    <Button 
                      key={p.id} 
                      variant="outline" 
                      className="h-20 flex flex-col items-start gap-1 justify-center px-4"
                      onClick={() => addTempItem(p)}
                    >
                      <span className="font-black text-xs uppercase leading-tight text-left">{p.name}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{formatCurrency(p.price_cents)}</span>
                    </Button>
                  ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button className="w-full h-12" onClick={() => setIsAdding(false)}>Fechar Cardápio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-black uppercase tracking-tighter text-2xl">Pagamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6">
            <Button variant="outline" className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2" onClick={() => handleCloseComanda('cash')}>
              <CreditCard className="h-6 w-6" /> Dinheiro
            </Button>
            <Button variant="outline" className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2" onClick={() => handleCloseComanda('pix')}>
              <Plus className="h-6 w-6" /> PIX
            </Button>
            <Button variant="outline" className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2" onClick={() => handleCloseComanda('card')}>
              <CreditCard className="h-6 w-6" /> Cartão
            </Button>
          </div>
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">Sincronizando...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
