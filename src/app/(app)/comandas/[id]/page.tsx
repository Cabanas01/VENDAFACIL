
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
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
  Search,
  Printer,
  CircleDollarSign,
  QrCode,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ComandaItem, Product, ComandaTotalView, Customer, CartItem } from '@/lib/types';
import { printReceipt } from '@/lib/print-receipt';
import { addComandaItem } from '@/lib/add-comanda-item';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandaDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { products, store, addSale, refreshStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comanda, setComanda] = useState<ComandaTotalView | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<ComandaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [tempItems, setTempItems] = useState<{ product: Product; quantity: number }[]>([]);
  
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Total calculado em tempo real via qty e unit_price
  const calculatedTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.qty * item.unit_price), 0);
  }, [items]);

  const fetchData = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const [baseRes, itemsRes] = await Promise.all([
        supabase.from('comandas').select('*').eq('id', id).maybeSingle(),
        supabase.from('comanda_itens').select('*').eq('comanda_id', id).order('created_at', { ascending: false })
      ]);

      if (!baseRes.data) {
        setNotFound(true);
        return;
      }

      setComanda({
        id: baseRes.data.id,
        store_id: baseRes.data.store_id,
        numero: baseRes.data.numero,
        mesa: baseRes.data.mesa,
        status: baseRes.data.status,
        cliente_nome: baseRes.data.cliente_nome,
        total: 0 // Será substituído pelo calculatedTotal na UI
      });

      setItems(itemsRes.data || []);
      setNotFound(false);

      if (baseRes.data.customer_id) {
        const { data: custData } = await supabase.from('customers').select('*').eq('id', baseRes.data.customer_id).single();
        setCustomer(custData);
      }
    } catch (err) {
      console.error('[FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const confirmOrder = async () => {
    if (tempItems.length === 0 || isSubmitting || !store || !comanda) return;
    setIsSubmitting(true);
    try {
      for (const i of tempItems) {
        await addComandaItem({
          storeId: store.id,
          numeroComanda: comanda.numero,
          productId: i.product.id,
          productName: i.product.name,
          qty: i.quantity,
          unitPrice: i.product.price_cents,
          destino: i.product.production_target || 'nenhum'
        });
      }

      toast({ title: 'Pedido Lançado!' });
      setTempItems([]);
      setIsAdding(false);
      await fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao Lançar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (sale?: any) => {
    if (comanda && store) {
      const saleToPrint = sale || {
        total_cents: calculatedTotal,
        payment_method: 'dinheiro',
        created_at: new Date().toISOString(),
        items: items.map(i => ({
          product_name_snapshot: i.product_name,
          qty: i.qty,
          unit_price_cents: i.unit_price,
          subtotal_cents: i.qty * i.unit_price
        }))
      };
      
      printReceipt(saleToPrint, store, '80mm', {
        numero: comanda.numero,
        mesa: comanda.mesa || 'Balcão',
        cliente: customer?.name || comanda.cliente_nome || 'Consumidor'
      });
    }
  };

  const handleCloseComanda = async (method: 'dinheiro' | 'pix' | 'cartao') => {
    if (!comanda || isSubmitting || !store || items.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const cartItems: CartItem[] = items.map(i => ({
        product_id: i.product_id,
        product_name_snapshot: i.product_name,
        qty: i.qty,
        unit_price_cents: i.unit_price,
        subtotal_cents: i.qty * i.unit_price,
        stock_qty: 999 
      }));

      const result = await addSale(cartItems, method, customer?.id || null);
      if (!result.success) throw new Error(result.error);

      await supabase.from('comandas').update({ status: 'fechada', closed_at: new Date().toISOString() }).eq('id', comanda.id);

      toast({ title: 'Comanda Encerrada!' });
      handlePrint(result.sale);
      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no Fechamento', description: err.message });
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground animate-pulse">Sincronizando Atendimento...</p>
    </div>
  );

  if (notFound) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-8">
      <AlertCircle className="h-12 w-12 text-muted-foreground opacity-40" />
      <h2 className="text-xl font-black uppercase tracking-tight">Comanda Indisponível</h2>
      <Button variant="outline" onClick={() => router.push('/comandas')}>Voltar para Lista</Button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/comandas')} className="h-10 w-10 p-0 rounded-full hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter uppercase leading-none">Comanda #{comanda?.numero}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black text-[10px] uppercase">STATUS: {comanda?.status?.toUpperCase()}</Badge>
              <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {comanda?.mesa || 'Balcão'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => handlePrint()} className="h-12 w-12 rounded-xl">
            <Printer className="h-5 w-5" />
          </Button>
          <div className="bg-background p-5 rounded-2xl border border-primary/10 shadow-sm flex flex-col items-end ring-4 ring-primary/5">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1 opacity-60">Consumo Acumulado</p>
            <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(calculatedTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner"><User className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente Atendido</p>
                  <p className="font-black text-sm uppercase tracking-tight">{customer?.name || comanda?.cliente_nome || 'CONSUMIDOR FINAL'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {tempItems.length > 0 && (
            <Card className="border-primary bg-primary/5 shadow-2xl animate-in slide-in-from-top-2 duration-500">
              <CardHeader className="py-3"><CardTitle className="text-[10px] font-black uppercase text-primary">Itens para Lançar</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  {tempItems.map(i => (
                    <div key={i.product.id} className="flex justify-between items-center font-bold text-sm bg-background p-2 rounded-lg border border-primary/10">
                      <span className="uppercase text-xs tracking-tight"><Badge variant="secondary" className="mr-2 px-1">x{i.quantity}</Badge>{i.product.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50" onClick={() => setTempItems(prev => prev.filter(x => x.product.id !== i.product.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                <Button className="w-full h-14 font-black uppercase tracking-widest" onClick={confirmOrder} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Send className="mr-2 h-4 w-4" />} Confirmar Lançamento
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center bg-muted/10 border-b py-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consumo Registrado</CardTitle>
              <Button size="sm" onClick={() => setIsAdding(true)} className="h-9 px-4 font-black uppercase text-[10px] tracking-widest"><Plus className="h-3 w-3 mr-1.5" /> Lançar Item</Button>
            </CardHeader>
            <div className="p-0">
              <Table>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/5 transition-colors border-b border-muted/10">
                      <TableCell className="font-bold py-4 px-6 uppercase text-xs">
                        {item.product_name}
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/10">{item.destino_preparo}</Badge>
                          <Badge className="text-[8px] h-4 px-1.5 uppercase font-black" variant={item.status === 'pronto' ? 'default' : 'secondary'}>{item.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs px-6">x{item.qty}</TableCell>
                      <TableCell className="text-right font-black text-primary px-6">{formatCurrency(item.qty * item.unit_price)}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground text-xs uppercase font-black">Nenhum consumo no momento.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-2xl overflow-hidden sticky top-24 ring-1 ring-primary/10">
            <CardHeader className="bg-primary/10 text-center py-6 border-b border-primary/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Conclusão de Venda</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-1 py-6 bg-background rounded-2xl border border-primary/5 shadow-inner">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total da Conta</p>
                <p className="text-5xl font-black text-foreground tracking-tighter">{formatCurrency(calculatedTotal)}</p>
              </div>
              <Button className="w-full h-20 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all hover:scale-[1.03] active:scale-95 group" onClick={() => setIsClosing(true)} disabled={calculatedTotal <= 0 || tempItems.length > 0 || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-7 w-7 animate-spin mr-3" /> : <CheckCircle2 className="h-7 w-7 mr-3" />} Fechar Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isClosing} onOpenChange={(open) => !isSubmitting && setIsClosing(open)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-muted/30 px-6 py-8 text-center border-b">
            <h2 className="text-3xl font-black font-headline uppercase tracking-tighter">PAGAMENTO</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Escolha o meio para finalizar a comanda</p>
          </div>
          
          <div className="p-6 space-y-3">
            <Button type="button" variant="outline" className="w-full h-16 justify-start text-sm font-black uppercase tracking-widest gap-4 border-2 bg-background hover:border-green-500 hover:bg-green-50 transition-all" onClick={() => handleCloseComanda('dinheiro')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0"><CircleDollarSign className="h-6 w-6 text-green-600" /></div> Dinheiro
            </Button>
            <Button type="button" variant="outline" className="w-full h-16 justify-start text-sm font-black uppercase tracking-widest gap-4 border-2 bg-background hover:border-cyan-500 hover:bg-cyan-50 transition-all" onClick={() => handleCloseComanda('pix')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><QrCode className="h-6 w-6 text-cyan-600" /></div> PIX
            </Button>
            <Button type="button" variant="outline" className="w-full h-16 justify-start text-sm font-black uppercase tracking-widest gap-4 border-2 bg-background hover:border-blue-500 hover:bg-blue-50 transition-all" onClick={() => handleCloseComanda('cartao')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><CreditCard className="h-6 w-6 text-blue-600" /></div> Cartão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar produto..." value={search} onChange={e => setSearch(e.target.value)} className="h-14 pl-11 text-lg font-bold" autoFocus />
            </div>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {products
                  .filter(p => p.active && p.name.toLowerCase().includes(search.toLowerCase()))
                  .map(p => (
                    <Button key={p.id} variant="outline" className="h-24 flex flex-col items-start gap-1 justify-center px-5" onClick={() => addTempItem(p)}>
                      <span className="font-black text-[11px] uppercase leading-tight text-left">{p.name}</span>
                      <span className="text-[10px] font-black text-primary">{formatCurrency(p.price_cents)}</span>
                    </Button>
                  ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t">
            <Button className="w-full h-12 font-black uppercase text-xs tracking-widest" onClick={() => setIsAdding(false)}>Voltar para Comanda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
