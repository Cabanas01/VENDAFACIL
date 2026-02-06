
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  X,
  CreditCard,
  QrCode,
  CircleDollarSign,
  Trash2, 
  ShoppingCart,
  Search,
  UserCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SaleItem, Sale, Product } from '@/lib/types';
import { printReceipt } from '@/lib/print-receipt';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandaDetailsPage() {
  const { id } = useParams();
  const { store, adicionarItem, fecharVenda, products } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isClosing, setIsClosing] = useState(false);
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [localCart, setLocalCart] = useState<{product: Product, qty: number}[]>([]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [saleRes, itemsRes] = await Promise.all([
        supabase.from('sales').select('*').eq('id', id).single(),
        supabase.from('sale_items').select('*').eq('sale_id', id)
      ]);

      if (saleRes.error) throw saleRes.error;
      setSale(saleRes.data as Sale);
      setItems(itemsRes.data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro de Sincronização', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cartTotalDisplay = useMemo(() => 
    localCart.reduce((acc, i) => acc + (i.product.price_cents * i.qty), 0), 
  [localCart]);

  const handleAddItemsFinal = async () => {
    if (localCart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      for (const item of localCart) {
        await adicionarItem(id as string, item.product.id, item.qty);
      }
      toast({ title: 'Pedido Lançado!' });
      setLocalCart([]);
      setIsAddingItems(false);
      await fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha ao lançar pedido', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async (method: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fecharVenda(id as string, method);
      toast({ title: 'Venda Concluída!' });
      
      if (store && sale) {
        printReceipt({ ...sale, items, payment_method: method } as Sale, store);
      }

      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao fechar conta', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <Loader2 className="animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Sincronizando Atendimento...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/comandas')} className="h-12 w-12 rounded-full bg-white shadow-sm">
            <ArrowLeft />
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-headline uppercase tracking-tighter leading-none">
              {sale?.table_number === 0 ? 'Balcão / PDV' : `Mesa ${sale?.table_number}`}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">{sale?.customer_name || 'Consumidor'}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Saldo Parcial</p>
          <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(sale?.total_cents || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-background">
          <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between py-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Extrato do Pedido</CardTitle>
            <Button size="sm" className="font-black uppercase text-[10px] h-9" onClick={() => setIsAddingItems(true)}>+ Adicionar Itens</Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5">
                <TableHead className="px-6 font-black uppercase text-[10px]">Descrição</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px]">Qtd</TableHead>
                <TableHead className="text-right px-6 font-black uppercase text-[10px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase">{item.product_name_snapshot}</span>
                      <span className="text-[9px] text-muted-foreground font-black uppercase">{formatCurrency(item.price_cents)} / un</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-black text-xs">x{item.quantity}</TableCell>
                  <TableCell className="text-right px-6 font-black text-primary">
                    {formatCurrency(item.subtotal_cents)}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Nenhum item lançado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="border-primary/20 bg-primary/5 shadow-2xl h-fit rounded-[32px] overflow-hidden">
          <CardHeader className="text-center py-10 bg-primary/10">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Total Consolidado</CardTitle>
            <p className="text-5xl font-black tracking-tighter mt-3 text-slate-900">{formatCurrency(sale?.total_cents || 0)}</p>
          </CardHeader>
          <CardContent className="p-8">
            <Button 
              className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 rounded-[24px]" 
              onClick={() => setIsClosing(true)} 
              disabled={!sale || (sale.total_cents || 0) <= 0}
            >
              <CheckCircle2 className="mr-3 h-6 w-6" /> Concluir Atendimento
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddingItems} onOpenChange={setIsAddingItems}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="flex h-[75vh]">
            <div className="flex-1 flex flex-col bg-white border-r">
              <div className="p-6 border-b bg-muted/5 flex items-center gap-4">
                <Search className="text-muted-foreground h-5 w-5" />
                <Input 
                  placeholder="Pesquisar produtos..." 
                  className="h-14 bg-slate-50 border-none rounded-2xl text-lg" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {products.filter(p => p.active && p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                    <Card key={p.id} className="cursor-pointer hover:border-primary transition-all shadow-sm border-primary/5 bg-background h-36" onClick={() => {
                      const existing = localCart.find(i => i.product.id === p.id);
                      if (existing) setLocalCart(localCart.map(i => i.product.id === p.id ? {...i, qty: i.qty + 1} : i));
                      else setLocalCart([...localCart, {product: p, qty: 1}]);
                    }}>
                      <CardContent className="p-5 flex flex-col justify-between h-full">
                        <h3 className="font-black text-[11px] uppercase tracking-tighter text-slate-900 line-clamp-2">{p.name}</h3>
                        <div className="flex items-end justify-between">
                          <span className="text-primary font-black text-xl tracking-tighter">{formatCurrency(p.price_cents)}</span>
                          <span className="text-[10px] font-black text-slate-300 uppercase">{p.stock_qty} UN</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="w-80 flex flex-col bg-slate-50/50">
              <div className="p-6 border-b font-black uppercase text-[10px] tracking-widest text-muted-foreground">Novos Itens</div>
              <ScrollArea className="flex-1 p-6">
                {localCart.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase truncate max-w-[120px]">{item.product.name}</span>
                      <span className="text-[9px] font-bold text-primary">x{item.qty}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 rounded-full" onClick={() => setLocalCart(localCart.filter(i => i.product.id !== item.product.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {localCart.length === 0 && (
                  <div className="py-20 text-center opacity-20"><ShoppingCart className="mx-auto h-10 w-10" /></div>
                )}
              </ScrollArea>
              <div className="p-6 border-t bg-white space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[9px] font-black uppercase text-muted-foreground">A Lançar</span>
                  <span className="font-black text-primary">{formatCurrency(cartTotalDisplay)}</span>
                </div>
                <Button className="w-full h-16 font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg" disabled={localCart.length === 0 || isSubmitting} onClick={handleAddItemsFinal}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Lançamento'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[40px] border-none shadow-2xl">
          <div className="p-10 bg-slate-900 text-white text-center relative">
            <button onClick={() => setIsClosing(false)} className="absolute right-6 top-6 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center"><X className="h-5 w-5" /></button>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Pagamento</DialogTitle>
            <DialogDescription className="text-white/40 uppercase font-bold text-[10px] mt-2 tracking-widest">
              Total a Pagar: {formatCurrency(sale?.total_cents || 0)}
            </DialogDescription>
          </div>
          <div className="p-10 space-y-4 bg-white">
            <Button variant="outline" className="w-full h-24 justify-start gap-8 border-none bg-slate-50 hover:bg-slate-100 rounded-[32px] px-10 transition-all" onClick={() => handleFinalize('cash')}>
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center shadow-inner"><CircleDollarSign className="text-green-600 h-7 w-7" /></div>
              <span className="font-black uppercase text-xs tracking-[0.2em]">Dinheiro</span>
            </Button>
            <Button className="w-full h-24 justify-start gap-8 border-none bg-cyan-400 text-white hover:bg-cyan-500 rounded-[32px] px-10 shadow-2xl transition-all" onClick={() => handleFinalize('pix')}>
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center shadow-inner"><QrCode className="text-white h-7 w-7" /></div>
              <span className="font-black uppercase text-xs tracking-[0.2em]">PIX</span>
            </Button>
            <Button variant="outline" className="w-full h-24 justify-start gap-8 border-none bg-slate-50 hover:bg-slate-100 rounded-[32px] px-10 transition-all" onClick={() => handleFinalize('card')}>
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center shadow-inner"><CreditCard className="text-blue-600 h-7 w-7" /></div>
              <span className="font-black uppercase text-xs tracking-[0.2em]">Cartão</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
