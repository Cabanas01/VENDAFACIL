
'use client';

/**
 * @fileOverview Gestão de Comanda Individual (PDV Operacional).
 * Obedece estritamente às funções RPC do backend.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Plus, 
  Search, 
  ShoppingCart, 
  Trash2, 
  X,
  CreditCard,
  QrCode,
  CircleDollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SaleItem, ComandaTotalView, Product } from '@/lib/types';
import { printReceipt } from '@/lib/print-receipt';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandaDetailsPage() {
  const { id } = useParams();
  const { store, adicionarItem, fecharComanda, products, refreshStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comanda, setComanda] = useState<ComandaTotalView | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isClosing, setIsClosing] = useState(false);
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [localCart, setLocalCart] = useState<{product: Product, qty: number}[]>([]);

  const fetchComandaData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [comandaRes, itemsRes] = await Promise.all([
        supabase.from('v_comandas_totais').select('*').eq('id', id).single(),
        supabase.from('sale_items').select('*').eq('comanda_id', id)
      ]);

      if (comandaRes.error) throw comandaRes.error;
      setComanda(comandaRes.data as any);
      setItems(itemsRes.data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchComandaData(); }, [fetchComandaData]);

  const handleAddItemsFinal = async () => {
    if (localCart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      for (const item of localCart) {
        await adicionarItem(id as string, item.product.id, item.qty);
      }
      toast({ title: 'Itens adicionados com sucesso!' });
      setLocalCart([]);
      setIsAddingItems(false);
      await fetchComandaData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha ao adicionar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async (method: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fecharComanda(id as string, method);
      toast({ title: 'Comanda fechada e paga!' });
      
      // Impressão opcional
      if (store && comanda) {
        const saleMock: any = { total_cents: comanda.total_cents, items, payment_method: method };
        printReceipt(saleMock, store);
      }

      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao fechar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/comandas')} className="rounded-full"><ArrowLeft /></Button>
          <h1 className="text-4xl font-black font-headline uppercase tracking-tighter">Comanda #{comanda?.numero}</h1>
          <Badge variant="outline" className="font-black uppercase">{comanda?.status}</Badge>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-muted-foreground">Subtotal Atual</p>
          <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(comanda?.total_cents || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-background">
          <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consumo</CardTitle>
            <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => setIsAddingItems(true)}>+ Adicionar Itens</Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 font-black uppercase text-[10px]">Item</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px]">Qtd</TableHead>
                <TableHead className="text-right px-6 font-black uppercase text-[10px]">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="px-6 font-bold text-xs uppercase">{item.product_name_snapshot}</TableCell>
                  <TableCell className="text-center font-black text-xs">x{item.quantity}</TableCell>
                  <TableCell className="text-right px-6 font-black text-primary">{formatCurrency(item.subtotal_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="border-primary/20 bg-primary/5 shadow-2xl h-fit">
          <CardHeader className="text-center py-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Total a Pagar</CardTitle>
            <p className="text-5xl font-black tracking-tighter mt-2">{formatCurrency(comanda?.total_cents || 0)}</p>
          </CardHeader>
          <CardContent className="p-8">
            <Button 
              className="w-full h-16 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20" 
              onClick={() => setIsClosing(true)} 
              disabled={!comanda || comanda.total_cents <= 0}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" /> Fechar e Receber
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE ADICIONAR ITENS */}
      <Dialog open={isAddingItems} onOpenChange={setIsAddingItems}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden rounded-[32px]">
          <div className="flex h-[75vh]">
            <div className="flex-1 flex flex-col bg-white border-r">
              <div className="p-6 border-b">
                <Input 
                  placeholder="Pesquisar produto..." 
                  className="h-12 bg-slate-50 border-none rounded-xl"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="grid grid-cols-2 gap-4">
                  {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                    <Card key={p.id} className="cursor-pointer hover:border-primary transition-all shadow-sm" onClick={() => {
                      const existing = localCart.find(i => i.product.id === p.id);
                      if (existing) setLocalCart(localCart.map(i => i.product.id === p.id ? {...i, qty: i.qty + 1} : i));
                      else setLocalCart([...localCart, {product: p, qty: 1}]);
                    }}>
                      <CardContent className="p-4">
                        <p className="font-black uppercase text-[10px] mb-1">{p.name}</p>
                        <p className="font-black text-primary">{formatCurrency(p.price_cents)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="w-80 flex flex-col bg-slate-50">
              <div className="p-6 border-b font-black uppercase text-[10px] tracking-widest text-muted-foreground">Lançamento Atual</div>
              <ScrollArea className="flex-1 p-6">
                {localCart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm">
                    <div className="text-[10px] font-black uppercase leading-tight">{item.product.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-primary">x{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setLocalCart(localCart.filter(i => i.product.id !== item.product.id))}><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
              <div className="p-6 border-t bg-white">
                <Button className="w-full h-14 font-black uppercase text-xs tracking-widest" disabled={localCart.length === 0 || isSubmitting} onClick={handleAddItemsFinal}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar Lançamento'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PAGAMENTO */}
      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[40px] border-none shadow-2xl">
          <div className="p-8 bg-slate-900 text-white text-center">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Forma de Pagamento</DialogTitle>
            <DialogDescription className="text-white/40 uppercase font-bold text-[9px] mt-1">Valor Final: {formatCurrency(comanda?.total_cents || 0)}</DialogDescription>
          </div>
          <div className="p-8 space-y-4 bg-white">
            <Button variant="outline" className="w-full h-20 justify-start gap-6 border-none bg-slate-50 hover:bg-slate-100 rounded-3xl px-8" onClick={() => handleFinalize('dinheiro')}>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><CircleDollarSign className="text-green-600" /></div>
              <span className="font-black uppercase text-xs tracking-widest">Dinheiro</span>
            </Button>
            <Button className="w-full h-20 justify-start gap-6 border-none bg-cyan-400 text-white hover:bg-cyan-500 rounded-3xl px-8 shadow-xl shadow-cyan-400/20" onClick={() => handleFinalize('pix')}>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center"><QrCode className="text-white" /></div>
              <span className="font-black uppercase text-xs tracking-widest">PIX QR Code</span>
            </Button>
            <Button variant="outline" className="w-full h-20 justify-start gap-6 border-none bg-slate-50 hover:bg-slate-100 rounded-3xl px-8" onClick={() => handleFinalize('cartao')}>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><CreditCard className="text-blue-600" /></div>
              <span className="font-black uppercase text-xs tracking-widest">Cartão</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
