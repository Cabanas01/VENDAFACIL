
'use client';

/**
 * @fileOverview Ponto de Venda (PDV) - Design Premium Cyan
 * Sincronizado para fidelidade visual absoluta à imagem enviada.
 */

import { useState, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Coins, 
  Loader2, 
  ArrowRight,
  History,
  Printer,
  X,
  QrCode
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Product, CartItem, Sale } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { printReceipt } from '@/lib/print-receipt';
import { startOfToday, isAfter } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function NewSalePage() {
  const { products, sales, addSale, store } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todaySales = useMemo(() => {
    const today = startOfToday();
    const safeSales = Array.isArray(sales) ? sales : [];
    return safeSales.filter(s => s && s.created_at && isAfter(new Date(s.created_at), today));
  }, [sales]);

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    const safeProducts = Array.isArray(products) ? products : [];
    return safeProducts.filter(p => 
      p && p.active && (
        (p.name || '').toLowerCase().includes(term) || 
        (p.barcode || '').includes(term)
      )
    );
  }, [products, search]);

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (Number(item.subtotal_cents) || 0), 0), 
  [cart]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.qty >= product.stock_qty) {
        toast({ variant: 'destructive', title: 'Estoque insuficiente' });
        return;
      }
      setCart(cart.map(item => item.product_id === product.id 
        ? { ...item, qty: item.qty + 1, subtotal_cents: (item.qty + 1) * item.unit_price_cents } 
        : item
      ));
    } else {
      if (product.stock_qty <= 0) {
        toast({ variant: 'destructive', title: 'Produto sem estoque' });
        return;
      }
      setCart([...cart, {
        product_id: product.id,
        product_name_snapshot: product.name,
        product_barcode_snapshot: product.barcode || null,
        qty: 1,
        unit_price_cents: product.price_cents,
        subtotal_cents: product.price_cents,
        stock_qty: product.stock_qty
      }]);
    }
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty < 1) {
      setCart(cart.filter(i => i.product_id !== productId));
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (product && newQty > product.stock_qty) {
      toast({ variant: 'destructive', title: 'Estoque insuficiente' });
      return;
    }

    setCart(cart.map(item => item.product_id === productId 
      ? { ...item, qty: newQty, subtotal_cents: newQty * item.unit_price_cents } 
      : item
    ));
  };

  const handleFinalize = async (method: string) => {
    if (cart.length === 0 || isSubmitting || !store) return;

    setIsSubmitting(true);
    try {
      const result = await addSale(cart, method);
      if (result) {
        toast({ title: 'Venda Concluída!' });
        printReceipt(result, store);
        setCart([]);
        setIsFinalizing(false);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Venda', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-black uppercase tracking-tighter">PONTO DE VENDA</h1>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{store?.name || 'VendaFácil'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        
        {/* COLUNA ESQUERDA: CATÁLOGO */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
          <Card className="flex-none bg-background border-none shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar produto ou bipar código..." 
                  className="pl-12 h-14 text-lg bg-slate-50 border-none shadow-inner rounded-2xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1 rounded-[32px] border bg-background/50">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
              {filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className="group cursor-pointer hover:border-primary transition-all active:scale-[0.98] shadow-sm border-primary/5 bg-background relative overflow-hidden h-36"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <h3 className="font-black text-[11px] leading-tight line-clamp-2 uppercase tracking-tighter text-slate-900">{product.name}</h3>
                    <div className="flex items-end justify-between">
                      <span className="text-primary font-black text-xl tracking-tighter">{formatCurrency(product.price_cents)}</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase">{product.stock_qty} un</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* COLUNA DIREITA: CARRINHO */}
        <Card className="flex flex-col h-full border-primary/10 shadow-2xl overflow-hidden rounded-[40px] bg-background">
          <Tabs defaultValue="cart" className="flex flex-col h-full">
            <CardHeader className="p-0 bg-muted/20">
              <TabsList className="w-full h-16 bg-transparent p-0 rounded-none border-b border-muted">
                <TabsTrigger value="cart" className="flex-1 h-full font-black text-[11px] uppercase tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                  <ShoppingCart className="h-4 w-4" /> CARRINHO
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 h-full font-black text-[11px] uppercase tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                  <History className="h-4 w-4" /> HOJE ({todaySales.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="cart" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-8">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex flex-col space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-[11px] font-black uppercase leading-tight tracking-tight text-slate-900">{item.product_name_snapshot}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 opacity-60">{formatCurrency(item.unit_price_cents)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50 rounded-full" onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-slate-100/50 rounded-2xl p-1 border border-slate-200/50">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white" onClick={() => updateQuantity(item.product_id, item.qty - 1)}><Minus className="h-4 w-4" /></Button>
                          <span className="w-12 text-center text-sm font-black">{item.qty}</span>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white" onClick={() => updateQuantity(item.product_id, item.qty + 1)}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <span className="font-black text-lg text-slate-950 tracking-tighter">{formatCurrency(item.subtotal_cents)}</span>
                      </div>
                      <Separator className="opacity-30" />
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="py-40 text-center space-y-6 opacity-20">
                      <ShoppingCart className="h-16 w-16 mx-auto" />
                      <p className="text-[11px] font-black uppercase tracking-[0.25em]">AGUARDANDO SELEÇÃO</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <CardFooter className="flex-none flex flex-col p-10 space-y-8 bg-slate-50/50 border-t border-muted/50">
                <div className="w-full flex justify-between items-end">
                  <span className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">TOTAL DA VENDA</span>
                  <span className="text-5xl font-black text-primary tracking-tighter">{formatCurrency(cartTotal)}</span>
                </div>
                <Button 
                  className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 rounded-[24px] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={() => setIsFinalizing(true)}
                >
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'CONFIRMAR VENDA'} <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </CardFooter>
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-4">
                  {todaySales.map(sale => (
                    <div key={sale.id} className="p-5 bg-background rounded-[24px] border border-primary/5 space-y-4 shadow-sm group hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Venda #{sale.id.substring(0,8)}</p>
                          <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">{new Date(sale.created_at).toLocaleTimeString()}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary opacity-0 group-hover:opacity-100 transition-all bg-primary/5 rounded-full" onClick={() => printReceipt(sale, store!)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-end pt-3 border-t border-muted/30">
                        <span className="text-[10px] text-muted-foreground font-black uppercase">{(sale.items || []).length} itens</span>
                        <span className="font-black text-xl tracking-tighter text-slate-950">{formatCurrency(sale.total_cents)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* MODAL DE PAGAMENTO (DESIGN PREMIUM FIEL À IMAGEM) */}
      <Dialog open={isFinalizing} onOpenChange={setIsFinalizing}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[40px]">
          <div className="p-10 bg-white relative">
            <button 
              onClick={() => setIsFinalizing(false)}
              className="absolute right-8 top-8 h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors shadow-sm ring-1 ring-slate-100"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="mb-12 pt-6 text-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 font-headline">FORMA DE PAGAMENTO</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              <Button 
                variant="outline" 
                className="h-24 justify-start text-[11px] font-black uppercase tracking-[0.2em] gap-8 border-none bg-slate-50 shadow-sm hover:bg-slate-100 transition-all px-10 rounded-[32px] group" 
                onClick={() => handleFinalize('dinheiro')} 
                disabled={isSubmitting}
              >
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center shrink-0 shadow-inner group-active:scale-95 transition-transform">
                  <Coins className="h-8 w-8 text-green-600" />
                </div>
                <span>DINHEIRO / TROCO</span>
              </Button>

              <Button 
                className="h-24 justify-start text-[11px] font-black uppercase tracking-[0.2em] gap-8 border-none bg-cyan-400 text-white shadow-2xl shadow-cyan-400/30 hover:bg-cyan-500 transition-all px-10 rounded-[32px] ring-4 ring-cyan-400/10 group" 
                onClick={() => handleFinalize('pix')} 
                disabled={isSubmitting}
              >
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-active:scale-95 transition-transform">
                  <QrCode className="h-8 w-8 text-white" />
                </div>
                <span>PIX QR CODE</span>
              </Button>

              <Button 
                variant="outline" 
                className="h-24 justify-start text-[11px] font-black uppercase tracking-[0.2em] gap-8 border-none bg-slate-50 shadow-sm hover:bg-slate-100 transition-all px-10 rounded-[32px] group" 
                onClick={() => handleFinalize('credito')} 
                disabled={isSubmitting}
              >
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0 shadow-inner group-active:scale-95 transition-transform">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                </div>
                <span>CARTÃO DÉBITO/CRÉDITO</span>
              </Button>
            </div>
          </div>

          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 animate-in fade-in backdrop-blur-sm">
              <Loader2 className="h-14 w-14 animate-spin text-primary mb-6" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">SINCRONIZANDO TRANSAÇÃO...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
