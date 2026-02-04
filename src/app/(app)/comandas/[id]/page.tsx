'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Plus, 
  Minus,
  Trash2, 
  Loader2, 
  CheckCircle2, 
  MapPin,
  CreditCard,
  Send,
  Search,
  CircleDollarSign,
  QrCode,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ComandaItem, Product, ComandaTotalView, Customer, CartItem } from '@/lib/types';
import { addComandaItemById } from '@/lib/add-comanda-item';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandaDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { products, store, addSale } = useAuth();
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

  const calculatedTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.qty * item.unit_price), 0);
  }, [items]);

  const fetchData = useCallback(async () => {
    if (!id || !store?.id) return;
    setLoading(true);
    
    try {
      const { data: baseData, error: baseErr } = await supabase
        .from('comandas')
        .select('*')
        .eq('id', id)
        .eq('store_id', store.id)
        .maybeSingle();

      if (baseErr || !baseData) {
        setNotFound(true);
        return;
      }

      const [itemsRes, custRes] = await Promise.all([
        supabase.from('comanda_itens').select('*').eq('comanda_id', id).order('created_at', { ascending: false }),
        baseData.customer_id ? supabase.from('customers').select('*').eq('id', baseData.customer_id).maybeSingle() : Promise.resolve({ data: null })
      ]);

      setComanda({
        id: baseData.id,
        store_id: baseData.store_id,
        numero: baseData.numero,
        mesa: baseData.mesa,
        status: baseData.status,
        cliente_nome: baseData.cliente_nome,
        total: 0 
      });

      setItems(itemsRes.data || []);
      setCustomer(custRes.data || null);
      setNotFound(false);

    } catch (err) {
      console.error('[FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [id, store?.id]);

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

  const removeTempItem = (productId: string) => {
    setTempItems(prev => {
      const existing = prev.find(i => i.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.product.id !== productId);
    });
  };

  const confirmOrder = async () => {
    if (tempItems.length === 0 || isSubmitting || !comanda) return;
    setIsSubmitting(true);
    try {
      for (const i of tempItems) {
        await addComandaItemById({
          comandaId: comanda.id,
          productId: i.product.id,
          productName: i.product.name,
          qty: i.quantity,
          unitPrice: i.product.price_cents,
          destino: i.product.production_target || 'nenhum'
        });
      }

      await supabase.from('comandas')
        .update({ status: 'em_preparo' })
        .eq('id', comanda.id)
        .in('status', ['aberta', 'em_preparo']);

      toast({ title: 'Itens Lançados!' });
      setTempItems([]);
      setIsAdding(false);
      await fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao Lançar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartClosing = async () => {
    if (!comanda) return;
    setIsSubmitting(true);
    try {
      await supabase.from('comandas')
        .update({ status: 'aguardando_pagamento' })
        .eq('id', comanda.id)
        .in('status', ['aberta', 'em_preparo', 'pronta', 'aguardando_pagamento']);
      
      setIsClosing(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no Fluxo', description: 'Falha ao preparar para pagamento.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseComandaFinal = async (method: 'dinheiro' | 'pix' | 'cartao') => {
    if (!comanda || isSubmitting || !store || items.length === 0) return;
    
    setIsSubmitting(true);
    try {
      // 1. Registrar a Venda no PDV (Financeiro)
      const cartItems: CartItem[] = items.map(i => ({
        product_id: i.product_id,
        product_name_snapshot: i.product_name,
        qty: i.qty,
        unit_price_cents: i.unit_price,
        subtotal_cents: i.qty * i.unit_price,
        stock_qty: 999 
      }));

      const normalizedMethod = method === 'dinheiro' ? 'cash' : (method === 'cartao' ? 'card' : method);
      const result = await addSale(cartItems, normalizedMethod, customer?.id || null);
      
      if (!result.success) throw new Error(result.error);

      // 2. Encerrar a Comanda via RPC (Garantindo nomes de parâmetros corretos)
      const { error: rpcError } = await supabase.rpc('fechar_comanda', {
        p_comanda_id: comanda.id,
        p_forma_pagamento: method
      });

      if (rpcError) throw rpcError;

      toast({ title: 'Venda Concluída!' });
      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha ao Fechar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !comanda) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground animate-pulse">Sincronizando...</p>
    </div>
  );

  if (notFound) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground opacity-40" />
      <h2 className="text-xl font-black uppercase">Atendimento não localizado</h2>
      <Button variant="outline" onClick={() => router.push('/comandas')}>Voltar</Button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/comandas')} className="h-10 p-0 rounded-full w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter uppercase leading-none">Comanda #{comanda?.numero}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={comanda?.status === 'aguardando_pagamento' ? 'destructive' : 'outline'} className="font-black text-[10px] uppercase">
                {comanda?.status?.replace('_', ' ')}
              </Badge>
              <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {comanda?.mesa || 'Balcão'}</span>
            </div>
          </div>
        </div>

        <div className="bg-background p-5 rounded-2xl border border-primary/10 shadow-sm flex flex-col items-end">
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1 opacity-60">Acumulado</p>
          <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(calculatedTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {tempItems.length > 0 && (
            <Card className="border-primary bg-primary/5 shadow-2xl">
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-black uppercase text-primary">Lançamento Pendente</CardTitle>
                <CardDescription>Confirme os itens para enviar à produção.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  {tempItems.map(i => (
                    <div key={i.product.id} className="flex justify-between items-center font-bold text-sm bg-background p-3 rounded-xl border">
                      <div className="flex flex-col">
                        <span className="uppercase text-xs font-black">{i.product.name}</span>
                        <span className="text-[10px] text-muted-foreground">{formatCurrency(i.product.price_cents)}/un</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded-lg h-8 bg-muted/20">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTempItem(i.product.id)}><Minus className="h-3 w-3" /></Button>
                          <span className="w-6 text-center text-xs font-black">{i.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addTempItem(i.product)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setTempItems(prev => prev.filter(x => x.product.id !== i.product.id))} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
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
              <div className="flex flex-col">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consumo Atual</CardTitle>
                <CardDescription>Itens já lançados neste atendimento.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsAdding(true)} className="h-9 px-4 font-black uppercase text-[10px]"><Plus className="h-3 w-3 mr-1.5" /> Adicionar Item</Button>
            </CardHeader>
            <div className="p-0">
              <Table>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} className="border-b border-muted/10">
                      <TableCell className="font-bold py-4 px-6 uppercase text-xs">
                        {item.product_name}
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[8px] font-black uppercase">{item.destino_preparo}</Badge>
                          <Badge className="text-[8px] uppercase font-black" variant={item.status === 'pronto' ? 'default' : 'secondary'}>{item.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs px-6">x{item.qty}</TableCell>
                      <TableCell className="text-right font-black text-primary px-6">{formatCurrency(item.qty * item.unit_price)}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground text-xs font-bold uppercase opacity-50">Sem consumos registrados</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-2xl overflow-hidden sticky top-24">
            <CardHeader className="bg-primary/10 text-center py-6 border-b border-primary/10">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Encerramento</CardTitle>
              <CardDescription>Resumo financeiro para fechamento.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-1 py-6 bg-background rounded-2xl border">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Valor Final</p>
                <p className="text-5xl font-black text-foreground tracking-tighter">{formatCurrency(calculatedTotal)}</p>
              </div>
              <Button className="w-full h-20 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={handleStartClosing} disabled={calculatedTotal <= 0 || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-7 w-7 animate-spin mr-3" /> : <CheckCircle2 className="h-7 w-7 mr-3" />} Fechar Turno
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isClosing} onOpenChange={(open) => !isSubmitting && setIsClosing(open)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-slate-950 text-white px-6 py-8 text-center border-b">
            <DialogTitle className="text-3xl font-black font-headline uppercase tracking-tighter text-center text-white">Pagamento</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-center text-white/60">Selecione o meio para faturar e encerrar</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-3 bg-background">
            <Button type="button" variant="outline" className="w-full h-16 justify-start text-sm font-black uppercase tracking-widest gap-4 border-2 hover:border-primary" onClick={() => handleCloseComandaFinal('dinheiro')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"><CircleDollarSign className="h-6 w-6 text-green-600" /></div> Dinheiro
            </Button>
            <Button type="button" variant="outline" className="w-full h-16 justify-start text-sm font-black uppercase tracking-widest gap-4 border-2 hover:border-primary" onClick={() => handleCloseComandaFinal('pix')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center"><QrCode className="h-6 w-6 text-cyan-600" /></div> PIX
            </Button>
            <Button type="button" variant="outline" className="w-full h-16 justify-start text-sm font-black uppercase tracking-widest gap-4 border-2 hover:border-primary" onClick={() => handleCloseComandaFinal('cartao')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><CreditCard className="h-6 w-6 text-blue-600" /></div> Cartão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-muted/10 border-b">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">Adicionar Itens</DialogTitle>
            <DialogDescription>Pesquise e selecione itens para a comanda.</DialogDescription>
          </DialogHeader>
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
                    <Button key={p.id} variant="outline" className="h-24 flex flex-col items-start gap-1 justify-center px-5 border-2 hover:border-primary transition-all" onClick={() => addTempItem(p)}>
                      <span className="font-black text-[11px] uppercase leading-tight text-left line-clamp-2">{p.name}</span>
                      <span className="text-[10px] font-black text-primary">{formatCurrency(p.price_cents)}</span>
                    </Button>
                  ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t">
            <Button className="w-full h-12 font-black uppercase text-xs tracking-widest" onClick={() => setIsAdding(false)}>Fechar Pesquisa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
