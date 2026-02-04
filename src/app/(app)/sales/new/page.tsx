'use client';

/**
 * @fileOverview Tela de Nova Venda / PDV com design fiel à imagem premium.
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Coins, 
  PiggyBank, 
  Loader2, 
  ArrowRight,
  History,
  Printer,
  X
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
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
import type { Product, CartItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { printReceipt } from '@/lib/print-receipt';
import { startOfToday, isAfter } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function NewSalePage() {
  const { products, sales, addSale, store } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todaySales = useMemo(() => {
    const today = startOfToday();
    return (sales || []).filter(s => isAfter(new Date(s.created_at), today));
  }, [sales]);

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    return products.filter(p => 
      p.active && (
        (p.name || '').toLowerCase().includes(term) || 
        (p.barcode || '').includes(term)
      )
    );
  }, [products, search]);

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.subtotal_cents, 0), 
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

  const handleFinalize = async (method: 'cash' | 'pix' | 'card') => {
    if (cart.length === 0 || isSubmitting || !store) return;

    setIsSubmitting(true);
    try {
      const result = await addSale(cart, method);
      
      if (result?.success) {
        toast({ title: 'Venda Concluída!', description: `Total de ${formatCurrency(cartTotal)} registrado.` });
        if (result.sale) printReceipt(result.sale, store);
        setCart([]);
        setIsFinalizing(false);
      } else {
        throw new Error(result?.error || 'Erro inesperado.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Venda', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="Ponto de Venda" subtitle={`Operador: ${store?.name || '...'}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        
        {/* LADO ESQUERDO: CATÁLOGO */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <Card className="flex-none bg-background border-none shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar produto por nome ou código..." 
                  className="pl-10 h-12 text-base bg-slate-50 border-none shadow-inner"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1 rounded-2xl border bg-background/50">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className="group cursor-pointer hover:border-primary transition-all active:scale-95 shadow-sm border-primary/5 bg-background"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-black text-xs leading-tight line-clamp-2 h-8 uppercase tracking-tighter">{product.name}</h3>
                    <div className="flex items-center justify-between pt-2 border-t border-muted/50">
                      <span className="text-primary font-black text-sm tracking-tight">{formatCurrency(product.price_cents)}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{product.stock_qty}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* LADO DIREITO: CARRINHO */}
        <Card className="flex flex-col h-full border-primary/10 shadow-2xl overflow-hidden rounded-[32px] bg-background">
          <Tabs defaultValue="cart" className="flex flex-col h-full">
            <CardHeader className="p-0 bg-muted/20">
              <TabsList className="w-full h-14 bg-transparent p-0 rounded-none border-b border-muted">
                <TabsTrigger value="cart" className="flex-1 h-full font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-background">
                  <ShoppingCart className="h-3.5 w-3.5" /> Carrinho
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 h-full font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-background">
                  <History className="h-3.5 w-3.5" /> Hoje ({todaySales.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="cart" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex flex-col space-y-3 animate-in slide-in-from-right-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-[11px] font-black uppercase leading-tight tracking-tight text-slate-900">{item.product_name_snapshot}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">{formatCurrency(item.unit_price_cents)}/un</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full" onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(item.product_id, item.qty - 1)}><Minus className="h-3 w-3" /></Button>
                          <span className="w-10 text-center text-xs font-black">{item.qty}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(item.product_id, item.qty + 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <span className="font-black text-sm text-primary tracking-tight">{formatCurrency(item.subtotal_cents)}</span>
                      </div>
                      <Separator className="opacity-30" />
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="py-32 text-center space-y-4 opacity-20">
                      <ShoppingCart className="h-12 w-12 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Aguardando seleção...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <CardFooter className="flex-none flex flex-col p-8 space-y-6 bg-slate-50/50 border-t border-muted/50">
                <div className="w-full flex justify-between items-end">
                  <span className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">Total da Venda</span>
                  <span className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(cartTotal)}</span>
                </div>
                <Button 
                  className="w-full h-16 text-xs font-black uppercase tracking-[0.15em] shadow-xl shadow-primary/20 rounded-2xl"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={() => setIsFinalizing(true)}
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar Venda'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-4">
                  {todaySales.map(sale => (
                    <div key={sale.id} className="p-4 bg-background rounded-2xl border border-primary/5 space-y-3 shadow-sm group">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Venda #{sale.id.substring(0,8)}</p>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-all" onClick={() => printReceipt(sale, store!)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-end pt-2 border-t border-muted/30">
                        <span className="text-[9px] text-muted-foreground font-black uppercase">{(sale.items || []).length} itens</span>
                        <span className="font-black text-base tracking-tighter text-slate-900">{formatCurrency(sale.total_cents)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* MODAL DE PAGAMENTO (FIEL À IMAGEM) */}
      <Dialog open={isFinalizing} onOpenChange={setIsFinalizing}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="p-8 bg-white relative">
            <button 
              onClick={() => setIsFinalizing(false)}
              className="absolute right-6 top-6 h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
            <DialogHeader className="mb-10 pt-4">
              <DialogTitle className="text-center text-xl font-black uppercase tracking-tighter text-slate-900">Forma de Pagamento</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 gap-4">
              <Button 
                variant="outline" 
                className="h-24 justify-start text-xs font-black uppercase tracking-[0.15em] gap-6 border-none bg-slate-50 shadow-sm hover:bg-slate-100 transition-all px-8 rounded-3xl" 
                onClick={() => handleFinalize('cash')} 
                disabled={isSubmitting}
              >
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Coins className="h-7 w-7 text-green-600" />
                </div>
                <span>Dinheiro / Troco</span>
              </Button>

              <Button 
                className="h-24 justify-start text-xs font-black uppercase tracking-[0.15em] gap-6 border-none bg-cyan-400 text-white shadow-xl shadow-cyan-400/20 hover:bg-cyan-500 transition-all px-8 rounded-3xl" 
                onClick={() => handleFinalize('pix')} 
                disabled={isSubmitting}
              >
                <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <PiggyBank className="h-7 w-7 text-white" />
                </div>
                <span>PIX QR CODE</span>
              </Button>

              <Button 
                variant="outline" 
                className="h-24 justify-start text-xs font-black uppercase tracking-[0.15em] gap-6 border-none bg-slate-50 shadow-sm hover:bg-slate-100 transition-all px-8 rounded-3xl" 
                onClick={() => handleFinalize('card')} 
                disabled={isSubmitting}
              >
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <CreditCard className="h-7 w-7 text-blue-600" />
                </div>
                <span>Cartão Débito/Crédito</span>
              </Button>
            </div>
          </div>

          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 animate-in fade-in">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Processando Transação...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
