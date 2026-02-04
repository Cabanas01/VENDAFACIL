'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  MapPin,
  CircleDollarSign,
  QrCode,
  CreditCard,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SaleItem, ComandaTotalView, Product, CartItem } from '@/lib/types';
import { printReceipt } from '@/lib/print-receipt';
import { isValidUUID } from '@/lib/utils';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandaDetailsPage() {
  const { id } = useParams();
  const { store, addSale, refreshStatus, products } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comanda, setComanda] = useState<ComandaTotalView | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isClosing, setIsClosing] = useState(false);
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [localCart, setLocalCart] = useState<CartItem[]>([]);

  const calculatedTotal = useMemo(() => items.reduce((acc, item) => acc + item.subtotal_cents, 0), [items]);

  const fetchData = useCallback(async () => {
    if (!id || !isValidUUID(id as string) || !store?.id) return;
    setLoading(true);
    
    try {
      const { data: baseData, error: comError } = await supabase
        .from('v_comandas_totais')
        .select('*')
        .eq('id', id)
        .single();

      if (comError) throw comError;

      const { data: salesData } = await supabase
        .from('sales')
        .select('id')
        .eq('comanda_id', id);
      
      const saleIds = (salesData || []).map(s => s.id);

      if (saleIds.length > 0) {
        const { data: itemsRes } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', saleIds);
        setItems((itemsRes as any) || []);
      } else {
        setItems([]);
      }

      setComanda(baseData as any);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro de Carga', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [id, store?.id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();
    return (products || []).filter(p => p.active && p.name.toLowerCase().includes(term));
  }, [products, search]);

  const addToLocalCart = (product: Product) => {
    const existing = localCart.find(i => i.product_id === product.id);
    if (existing) {
      setLocalCart(localCart.map(i => i.product_id === product.id 
        ? { ...i, qty: i.qty + 1, subtotal_cents: (i.qty + 1) * i.unit_price_cents } 
        : i
      ));
    } else {
      setLocalCart([...localCart, {
        product_id: product.id,
        product_name_snapshot: product.name,
        qty: 1,
        unit_price_cents: product.price_cents,
        subtotal_cents: product.price_cents,
        stock_qty: product.stock_qty
      }]);
    }
  };

  const handleCommitItems = async () => {
    if (localCart.length === 0 || !comanda || !store) return;
    setIsSubmitting(true);
    try {
      const result = await addSale(localCart, 'cash', null);
      
      if (result?.success && result.saleId) {
        await supabase.from('sales').update({ comanda_id: comanda.id }).eq('id', result.saleId);
        toast({ title: 'Itens adicionados!' });
        setLocalCart([]);
        setIsAddingItems(false);
        fetchData();
      } else {
        throw new Error(result?.error || 'Erro ao processar itens.');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseComandaFinal = async (method: 'cash' | 'pix' | 'card') => {
    if (!comanda || isSubmitting || !store) return;
    setIsSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc('fechar_comanda', {
        p_comanda_id: comanda.id,
        p_forma_pagamento: method
      });

      if (rpcError) throw rpcError;

      const saleMock: any = {
        total_cents: calculatedTotal,
        payment_method: method,
        items: items,
        created_at: new Date().toISOString()
      };
      
      printReceipt(saleMock, store);

      toast({ title: 'Atendimento encerrado!' });
      await refreshStatus();
      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no fechamento', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest opacity-50">Sincronizando Atendimento...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/comandas')} className="h-10 w-10 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-black font-headline uppercase tracking-tighter">Comanda #{comanda?.numero}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="font-black text-[10px] uppercase">{comanda?.status}</Badge>
              <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {comanda?.mesa || 'Balcão'}</span>
              {comanda?.cliente_nome && <span className="text-[10px] font-black uppercase text-primary border-l pl-3">Cliente: {comanda.cliente_nome}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="h-12 font-black uppercase text-[10px] tracking-widest" onClick={() => {
            const saleMock: any = { total_cents: calculatedTotal, items, created_at: new Date().toISOString() };
            printReceipt(saleMock, store!, '80mm', { numero: comanda?.numero || 0, mesa: comanda?.mesa || null, cliente: comanda?.cliente_nome || null });
          }}>
            <Printer className="h-4 w-4 mr-2" /> PRÉ-CONTA
          </Button>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Consumo Acumulado</p>
            <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(calculatedTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-background">
          <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between py-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Itens da Comanda</CardTitle>
            <Button size="sm" className="h-8 font-black uppercase text-[9px] tracking-widest" onClick={() => setIsAddingItems(true)}>
              <Plus className="h-3 w-3 mr-1.5" /> Adicionar Produtos
            </Button>
          </CardHeader>
          <div className="p-0">
            <Table>
              <TableHeader className="bg-muted/5">
                <TableRow>
                  <TableHead className="px-6 font-black text-[10px] uppercase">Produto</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase">Qtd</TableHead>
                  <TableHead className="text-right px-6 font-black text-[10px] uppercase">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                    <TableCell className="font-bold py-4 px-6 uppercase text-xs">
                      {item.product_name_snapshot}
                      <div className="mt-1"><Badge variant="secondary" className="text-[8px] uppercase font-black">{item.status || 'servido'}</Badge></div>
                    </TableCell>
                    <TableCell className="text-center font-black text-xs">x{item.quantity}</TableCell>
                    <TableCell className="text-right px-6 font-black text-primary">{formatCurrency(item.subtotal_cents)}</TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-20 text-muted-foreground uppercase font-black text-[10px] tracking-widest opacity-30">Nenhum consumo registrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-2xl overflow-hidden sticky top-24">
            <CardHeader className="bg-primary/10 text-center py-6 border-b border-primary/10">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Finalização</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground opacity-60">Total do Atendimento</p>
                <p className="text-5xl font-black text-foreground tracking-tighter">{formatCurrency(calculatedTotal)}</p>
              </div>
              <Button 
                className="w-full h-20 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all" 
                onClick={() => setIsClosing(true)} 
                disabled={calculatedTotal <= 0}
              >
                <CheckCircle2 className="h-7 w-7 mr-3" /> Fechar Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAddingItems} onOpenChange={setIsAddingItems}>
        <DialogContent className="sm:max-w-5xl p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="flex h-[85vh]">
            <div className="flex-1 flex flex-col bg-white border-r">
              <div className="p-8 border-b space-y-6">
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter">CARDÁPIO DE VENDAS</DialogTitle>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar produto..." 
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-none shadow-inner text-lg font-medium" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 p-8 bg-slate-50/30">
                <div className="grid grid-cols-2 gap-6">
                  {filteredProducts.map(p => (
                    <Card key={p.id} className="cursor-pointer hover:border-primary border-transparent active:scale-95 transition-all shadow-sm bg-white" onClick={() => addToLocalCart(p)}>
                      <CardContent className="p-6 space-y-4">
                        <p className="text-xs font-black uppercase text-slate-900 leading-tight h-10 line-clamp-2">{p.name}</p>
                        <p className="font-black text-lg tracking-tighter text-primary">{formatCurrency(p.price_cents)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="w-96 bg-white flex flex-col relative shadow-2xl">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="flex items-center gap-2 font-black uppercase text-[11px] tracking-[0.2em] text-slate-900">
                  <ShoppingCart className="h-4 w-4" /> LANÇAMENTO ATUAL
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsAddingItems(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-8">
                <div className="space-y-6">
                  {localCart.map(item => (
                    <div key={item.product_id} className="flex justify-between items-start animate-in slide-in-from-right-2">
                      <div className="flex-1 pr-4">
                        <p className="font-black uppercase text-[11px] leading-tight text-slate-900">{item.product_name_snapshot}</p>
                        <p className="text-primary font-bold text-[10px] mt-1 uppercase">x{item.qty} — {formatCurrency(item.unit_price_cents)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => setLocalCart(localCart.filter(i => i.product_id !== item.product_id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {localCart.length === 0 && (
                    <div className="py-32 text-center flex flex-col items-center gap-4 opacity-20">
                      <ShoppingCart className="h-12 w-12" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Aguardando seleção...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-8 bg-white border-t space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">SUBTOTAL</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">
                    {formatCurrency(localCart.reduce((acc, i) => acc + i.subtotal_cents, 0))}
                  </span>
                </div>
                <Button className="w-full h-16 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20" disabled={localCart.length === 0 || isSubmitting} onClick={handleCommitItems}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'CONFIRMAR PEDIDO'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <DialogHeader className="bg-[#0f172a] text-white px-6 py-12 text-center">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-white">Pagamento</DialogTitle>
            <DialogDescription className="text-white/60 font-bold uppercase text-[10px]">Selecione a forma de faturamento</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-4 bg-slate-50">
            <Button variant="outline" className="w-full h-20 justify-start gap-6 border-2 font-black uppercase text-xs hover:border-green-500 hover:bg-green-50 transition-all" onClick={() => handleCloseComandaFinal('cash')}>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><CircleDollarSign className="text-green-600" /></div> Dinheiro
            </Button>
            <Button variant="outline" className="w-full h-20 justify-start gap-6 border-2 font-black uppercase text-xs hover:border-cyan-500 hover:bg-cyan-50 transition-all" onClick={() => handleCloseComandaFinal('pix')}>
              <div className="h-12 w-12 rounded-full bg-cyan-100 flex items-center justify-center"><QrCode className="text-cyan-600" /></div> Pix
            </Button>
            <Button className="w-full h-20 justify-start gap-6 font-black uppercase text-xs bg-accent hover:bg-accent/90 shadow-xl shadow-accent/20" onClick={() => handleCloseComandaFinal('card')}>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center"><CreditCard className="text-white" /></div> Cartão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
