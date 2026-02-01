
'use client';

/**
 * @fileOverview Tela de Nova Venda / PDV com Histórico e Reimpressão.
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
  PiggyBank, 
  Loader2, 
  ArrowRight,
  History,
  Printer
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
import { format } from 'date-fns';

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
    if (!product) return;
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

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== id) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return item;
      if (newQty > item.stock_qty) return item;
      return { ...item, quantity: newQty, subtotal_cents: newQty * item.unit_price_cents };
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.product_id !== id));
  };

  const handleFinalize = async (method: 'cash' | 'pix' | 'card') => {
    if (cart.length === 0 || isSubmitting) return;
    if (!store?.id) return;

    setIsSubmitting(true);
    try {
      const result = await addSale(cart, method);
      
      toast({ 
        title: 'Venda Concluída!', 
        description: `Total de ${formatCurrency(cartTotal)} registrado.` 
      });
      
      // Impressão automática
      if (result && result.success && store) {
        // Buscamos a venda completa no histórico para garantir os itens
        const newSale = sales.find(s => s.id === result.saleId);
        if (newSale) printReceipt(newSale, store);
      }

      setCart([]);
      setIsFinalizing(false);
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Transação',
        description: error.message || 'Erro ao processar venda.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprint = (sale: Sale) => {
    if (store && sale) {
      printReceipt(sale, store);
      toast({ title: 'Enviado para impressora' });
    }
  };

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Sincronizando PDV...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="Ponto de Venda" subtitle={`Operador: ${store.name}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        
        {/* LADO ESQUERDO: CATÁLOGO */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <Card className="flex-none">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filtrar produtos por nome ou código..." 
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
                      <Badge variant="secondary" className="text-[9px] px-1 h-4">
                        {product.stock_qty}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* LADO DIREITO: CARRINHO E HISTÓRICO */}
        <Card className="flex flex-col h-full border-primary/10 shadow-2xl overflow-hidden">
          <Tabs defaultValue="cart" className="flex flex-col h-full">
            <CardHeader className="p-0 bg-muted/30">
              <TabsList className="w-full h-12 bg-transparent p-0 rounded-none border-b">
                <TabsTrigger value="cart" className="flex-1 h-full data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-black text-[10px] uppercase tracking-widest gap-2">
                  <ShoppingCart className="h-3.5 w-3.5" /> Carrinho
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 h-full data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-black text-[10px] uppercase tracking-widest gap-2">
                  <History className="h-3.5 w-3.5" /> Histórico
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="cart" className="flex-1 flex flex-col m-0 p-0 overflow-hidden data-[state=active]:flex">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex flex-col space-y-2 animate-in slide-in-from-right-2 duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-[11px] font-black leading-tight uppercase">{item.product_name_snapshot}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{formatCurrency(item.unit_price_cents)}/un</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50 hover:text-destructive" onClick={() => removeFromCart(item.product_id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border rounded-md h-8 bg-background">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQty(item.product_id, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                          <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQty(item.product_id, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                        </div>
                        <span className="font-black text-sm text-primary">{formatCurrency(item.subtotal_cents)}</span>
                      </div>
                      <Separator className="mt-2 opacity-50" />
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="py-32 text-center space-y-2">
                      <ShoppingCart className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                      <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Carrinho Vazio</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <CardFooter className="flex-none flex flex-col p-6 space-y-4 bg-primary/5 border-t border-primary/10">
                <div className="w-full flex justify-between items-end">
                  <span className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">Total Geral</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>

                <Button 
                  className="w-full h-14 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={() => setIsFinalizing(true)}
                >
                  Fechar Venda <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </TabsContent>

            <TabsContent value="history" className="flex-1 m-0 p-0 overflow-hidden data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {sales.slice(0, 10).map(sale => (
                    <div key={sale.id} className="p-3 bg-muted/20 rounded-lg border border-border/50 space-y-2 group hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight">
                            {format(new Date(sale.created_at), 'HH:mm')} - {format(new Date(sale.created_at), 'dd/MM')}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[8px] h-4 font-black uppercase bg-background">
                              {paymentMethodIcons[sale.payment_method]} {sale.payment_method}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleReprint(sale)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] text-muted-foreground font-bold">{(sale.items || []).length} itens</span>
                        <span className="font-black text-sm">{formatCurrency(sale.total_cents)}</span>
                      </div>
                    </div>
                  ))}
                  {sales.length === 0 && (
                    <div className="py-32 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                      Nenhuma venda hoje
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* DIALOG DE FECHAMENTO */}
      <Dialog open={isFinalizing} onOpenChange={setIsFinalizing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-center tracking-tighter">Escolha o Pagamento</DialogTitle>
            <DialogDescription className="text-center font-medium">Total de <span className="font-black text-primary">{formatCurrency(cartTotal)}</span></DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4">
            <Button 
              variant="outline" 
              className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleFinalize('cash')}
              disabled={isSubmitting}
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"><Coins className="h-6 w-6 text-green-600" /></div>
              Dinheiro
            </Button>

            <Button 
              variant="outline" 
              className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleFinalize('pix')}
              disabled={isSubmitting}
            >
              <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center"><PiggyBank className="h-6 w-6 text-cyan-600" /></div>
              PIX Instantâneo
            </Button>

            <Button 
              variant="outline" 
              className="h-16 justify-start text-base font-black uppercase tracking-widest gap-4 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleFinalize('card')}
              disabled={isSubmitting}
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><CreditCard className="h-6 w-6 text-blue-600" /></div>
              Cartão Débito/Crédito
            </Button>
          </div>

          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg z-50 animate-in fade-in duration-300">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">Processando Transação...</p>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button type="button" variant="ghost" className="font-bold text-[10px] uppercase tracking-widest" onClick={() => setIsFinalizing(false)} disabled={isSubmitting}>
              Cancelar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
