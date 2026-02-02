'use client';

/**
 * @fileOverview Gestão Detalhada da Comanda - Sincronização Garantida Pós-Fechamento
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Clock,
  ShoppingCart,
  Wallet,
  ClipboardList,
  Search,
  Send
} from 'lucide-center';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ComandaItem, Product, ComandaTotalView } from '@/lib/types';
import { cn } from '@/lib/utils';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

type TempItem = { product: Product; quantity: number; };

export default function ComandaDetailsPage() {
  const { id } = useParams();
  const { products, refreshStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comanda, setComanda] = useState<ComandaTotalView | null>(null);
  const [items, setItems] = useState<ComandaItem[]>([]);
  const [tempItems, setTempItems] = useState<TempItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [comandaRes, itemsRes] = await Promise.all([
        supabase.from('v_comandas_totais').select('*').eq('comanda_id', id).maybeSingle(),
        supabase.from('comanda_itens').select('*').eq('comanda_id', id).order('created_at', { ascending: false })
      ]);

      // Se a comanda não retornar (foi fechada por outro terminal)
      if (!comandaRes.data || comandaRes.data.status !== 'aberta') {
        router.replace('/comandas');
        return;
      }

      setComanda(comandaRes.data);
      setItems(itemsRes.data || []);
    } catch (err: any) {
      console.error('[FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel(`sync_comanda_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas', filter: `id=eq.${id}` }, (payload) => {
        if (payload.new && (payload.new as any).status !== 'aberta') {
          router.replace('/comandas');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens', filter: `comanda_id=eq.${id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchData, router]);

  const addTempItem = (product: Product) => {
    setTempItems(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      return ex ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { product, quantity: 1 }];
    });
  };

  const confirmOrder = async () => {
    if (tempItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('comanda_itens').insert(tempItems.map(i => ({
        comanda_id: id as string,
        product_id: i.product.id,
        product_name: i.product.name,
        quantidade: i.quantity,
        preco_unitario: i.product.price_cents,
        destino_preparo: i.product.destino_preparo || 'nenhum'
      })));
      if (error) throw error;
      toast({ title: 'Pedido Enviado!' });
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
    if (!comanda?.total || comanda.total <= 0) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('fechar_comanda', {
        p_comanda_id: id as string,
        p_payment_method: method
      });

      if (error) throw error;
      
      // REGRA DE OURO: Invalida todos os estados locais ANTES de mudar de página
      await refreshStatus(); 
      toast({ title: 'Comanda Encerrada!' });
      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao fechar', description: err.message });
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/comandas')}><ArrowLeft className="mr-2" /> Comandas</Button>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-muted-foreground">Total</p>
          <p className="text-4xl font-black text-primary">{formatCurrency(comanda?.total || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {tempItems.length > 0 && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-black text-xs uppercase text-primary">Rascunho do Pedido</h3>
                {tempItems.map(i => (
                  <div key={i.product.id} className="flex justify-between font-bold text-sm">
                    <span>{i.product.name} x{i.quantity}</span>
                    <Button variant="ghost" size="icon" onClick={() => setTempItems(prev => prev.filter(x => x.product.id !== i.product.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button className="w-full" onClick={confirmOrder} disabled={isSubmitting}>Confirmar e Enviar</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row justify-between items-center bg-muted/10">
              <CardTitle className="text-xs font-black uppercase">Consumo Efetivado</CardTitle>
              <Button size="sm" onClick={() => setIsAdding(true)}>Adicionar Itens</Button>
            </CardHeader>
            <Table>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold text-sm">{item.product_name} <span className="text-xs text-muted-foreground ml-2">x{item.quantidade}</span></TableCell>
                    <TableCell className="text-right font-black">{formatCurrency(item.quantidade * item.preco_unitario)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 p-6 border-primary/10">
            <Button 
              className="w-full h-14 font-black uppercase" 
              onClick={() => setIsClosing(true)}
              disabled={!comanda?.total || comanda.total <= 0 || tempItems.length > 0}
            >
              Fechar e Receber
            </Button>
          </Card>
        </div>
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-xl">
          <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          <ScrollArea className="h-96">
            <div className="grid grid-cols-2 gap-2">
              {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                <Button key={p.id} variant="outline" className="h-16 text-xs font-bold" onClick={() => addTempItem(p)}>{p.name}</Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-center">Forma de Pagamento</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button variant="outline" className="h-12 font-black" onClick={() => handleCloseComanda('cash')}>DINHEIRO</Button>
            <Button variant="outline" className="h-12 font-black" onClick={() => handleCloseComanda('pix')}>PIX</Button>
            <Button variant="outline" className="h-12 font-black" onClick={() => handleCloseComanda('card')}>CARTÃO</Button>
          </div>
          {isSubmitting && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}