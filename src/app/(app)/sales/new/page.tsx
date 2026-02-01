'use client';

/**
 * @fileOverview Tela de Nova Venda / PDV com Histórico de Hoje e Impressão.
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
  CalendarDays
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Product, CartItem, Sale } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { printReceipt } from '@/lib/print-receipt';
import { format, startOfToday, isAfter } from 'date-fns';
import { trackEvent } from '@/lib/analytics/track';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const paymentMethodIcons = {
  cash: <Coins className="h-3 w-3" />,
  pix: <PiggyBank className="h-3 w-3" />,
  card: <CreditCard className="h-3 w-3" />,
};

export default function NewSalePage() {
  const { products, sales, addSale, store } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vendas realizadas hoje para histórico rápido
  const todaySales = useMemo(() => {
    const today = startOfToday();
    return (sales || []).filter(s => isAfter(new Date(s.created_at), today));
  }, [sales]);

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    return products.filter(p => 
      p.active && (
        (p.name || '').toLowerCase().includes(term) || 
        (p.barcode || '').includes(term) ||
        (p.category || '').toLowerCase().includes(term)
      )
    );
  }, [products, search]);

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.subtotal_cents, 0), 
  [cart]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock_qty) {
        toast({ variant: 'destructive', title: 'Estoque insuficiente' });
        return;
      }
      setCart(cart.map(item => item.product_id === product.id 
        ? { ...item, quantity: item.quantity + 1, subtotal_cents: (item.quantity + 1) * item.unit_price_cents } 
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
        quantity: 1,
        unit_price_cents: product.price_cents,
        subtotal_cents: product.price_cents,
        stock_qty: product.stock_qty
      }]);
    }
  };

  const handleFinalize = async (method: 'cash' | 'pix' | 'card') => {
    if (cart.length === 0 || isSubmitting || !store) return;

    setIsSubmitting(true);
    try {
      const result = await addSale(cart, method);
      
      trackEvent('sale_completed', {
        total: cartTotal / 100,
        method,
        items_count: cart.length,
        store_id: store.id
      });

      toast({ title: 'Venda Concluída!', description: `Total de ${formatCurrency(cartTotal)} registrado.` });
      
      // Impressão automática se houver venda
      if (result && result.saleId) {
        const fullSale = sales.find(s => s.id === result.saleId);
        if (fullSale) printReceipt(fullSale, store);
      }

      setCart([]);
      setIsFinalizing(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Venda', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprint = (sale: Sale) => {
    if (store && sale) {
      printReceipt(sale, store);
      toast({ title: 'Cupom enviado para impressão' });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="Ponto de Venda" subtitle={`Operador: ${store?.name || 'Carregando...'}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        
        {/* CATÁLOGO DE PRODUTOS */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <Card className="flex-none">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar produto por nome ou código..." 
                  className="pl-10 h-12 text-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1 rounded-md border bg-background/50">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className="group cursor-pointer hover:border-primary transition-all active:scale-95 shadow-sm"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-bold text-xs leading-tight line-clamp-2 h-8 uppercase">{product.name}</h3>
                    <div className="flex items-center justify-between pt-2 border-t border-muted/50">
                      <span className="text-primary font-black text-sm">{formatCurrency(product.price_cents)}</span>
                      <Badge variant="secondary" className="text-[9px] px-1 h-4">{product.stock_qty}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* CARRINHO E HISTÓRICO DE HOJE */}
        <Card className="flex flex-col h-full border-primary/10 shadow-2xl overflow-hidden">
          <Tabs defaultValue="cart" className="flex flex-col h-full">
            <CardHeader className="p-0 bg-muted/30">
              <TabsList className="w-full h-12 bg-transparent p-0 rounded-none border-b">
                <TabsTrigger value="cart" className="flex-1 h-full font-black text-[10px] uppercase tracking-widest gap-2">
                  <ShoppingCart className="h-3.5 w-3.5" /> Carrinho
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 h-full font-black text-[10px] uppercase tracking-widest gap-2">
                  <CalendarDays className="h-3.5 w-3.5" /> Hoje ({todaySales.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="cart" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex flex-col space-y-2 animate-in slide-in-from-right-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-[11px] font-black uppercase leading-tight">{item.product_name_snapshot}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{formatCurrency(item.unit_price_cents)}/un</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50" onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border rounded-md h-8 bg-background">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCart(cart.map(i => i.product_id === item.product_id ? {...i, quantity: Math.max(1, i.quantity - 1), subtotal_cents: Math.max(1, i.quantity - 1) * i.unit_price_cents} : i))}><Minus className="h-3.5 w-3.5" /></Button>
                          <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addToCart(products.find(p => p.id === item.product_id)!)}><Plus className="h-3.5 w-3.5" /></Button>
                        </div>
                        <span className="font-black text-sm text-primary">{formatCurrency(item.subtotal_cents)}</span>
                      </div>
                      <Separator className="opacity-50" />
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="py-32 text-center space-y-2 opacity-20">
                      <ShoppingCart className="h-10 w-10 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Aguardando itens...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <CardFooter className="flex-none flex flex-col p-6 space-y-4 bg-primary/5 border-t border-primary/10">
                <div className="w-full flex justify-between items-end">
                  <span className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">Total da Venda</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(cartTotal)}</span>
                </div>
                <Button 
                  className="w-full h-14 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={() => setIsFinalizing(true)}
                >
                  Confirmar Venda <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {todaySales.map(sale => (
                    <div key={sale.id} className="p-3 bg-muted/20 rounded-lg border border-border/50 space-y-2 group hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight">{format(new Date(sale.created_at), 'HH:mm:ss')}</p>
                          <Badge variant="outline" className="text-[8px] h-4 font-black uppercase bg-background mt-1 gap-1">
                            {paymentMethodIcons[sale.payment_method]} {sale.payment_method}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleReprint(sale)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] text-muted-foreground font-bold">{(sale.items || []).length} itens</span>
                        <span className="font-black text-sm">{formatCurrency(sale.total_cents)}</span>
                      </div>
                    </div>
                  ))}
                  {todaySales.length === 0 && (
                    <div className="py-32 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-20">
                      Nenhuma venda hoje.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <Dialog open={isFinalizing} onOpenChange={setIsFinalizing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-center font-black uppercase tracking-tighter">Forma de Pagamento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <Button variant="outline" className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2 hover:border-primary" onClick={() => handleFinalize('cash')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"><Coins className="h-6 w-6 text-green-600" /></div>
              Dinheiro / Troco
            </Button>
            <Button variant="outline" className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2 hover:border-primary" onClick={() => handleFinalize('pix')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center"><PiggyBank className="h-6 w-6 text-cyan-600" /></div>
              PIX QR Code
            </Button>
            <Button variant="outline" className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2 hover:border-primary" onClick={() => handleFinalize('card')} disabled={isSubmitting}>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><CreditCard className="h-6 w-6 text-blue-600" /></div>
              Cartão Débito/Crédito
            </Button>
          </div>
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 animate-in fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">Sincronizando Banco...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
