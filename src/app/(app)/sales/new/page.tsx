'use client';

/**
 * @fileOverview Tela de Nova Venda / PDV
 * 
 * Interface de balcão otimizada para rapidez.
 * Lida com busca de produtos, carrinho e finalização segura via Server Action.
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
  Package,
  ArrowRight
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Product, CartItem } from '@/lib/types';
import { useRouter } from 'next/navigation';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function NewSalePage() {
  const { products, addSale } = useAuth();
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
        toast({ variant: 'destructive', title: 'Estoque insuficiente', description: `Apenas ${product.stock_qty} disponíveis.` });
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
      if (newQty > item.stock_qty) {
        toast({ variant: 'destructive', title: 'Limite de estoque atingido' });
        return item;
      }
      return { ...item, quantity: newQty, subtotal_cents: newQty * item.unit_price_cents };
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.product_id !== id));
  };

  const handleFinalize = async (method: 'cash' | 'pix' | 'card') => {
    if (cart.length === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const result = await addSale(cart, method);
      
      if (result.success) {
        toast({ 
          title: 'Venda realizada!', 
          description: `Venda registrada com sucesso.` 
        });
        setCart([]);
        setIsFinalizing(false);
        router.push('/sales');
      }
    } catch (error: any) {
      console.error('[PDV_FINALIZE_ERROR]', error);
      toast({
        variant: 'destructive',
        title: 'Falha na Transação',
        description: error.message || 'Erro inesperado ao registrar a venda.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="Ponto de Venda" subtitle="Registre vendas de forma rápida e prática." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        
        {/* Lado Esquerdo: Catálogo */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <Card className="flex-none">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nome, categoria ou código de barras..." 
                  className="pl-10 h-12 text-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1 rounded-md border bg-background/50 shadow-inner">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className="group cursor-pointer hover:border-primary transition-all active:scale-95 shadow-sm"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2 h-10">{product.name}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter italic">
                        {product.category || 'Geral'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-primary font-black text-sm">{formatCurrency(product.price_cents)}</span>
                      <Badge variant={product.stock_qty < 5 ? "destructive" : "outline"} className="text-[9px] px-1 h-4">
                        {product.stock_qty} un
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                  <p className="text-muted-foreground text-sm">Nenhum produto ativo encontrado.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Lado Direito: Carrinho */}
        <Card className="flex flex-col h-full border-primary/20 shadow-2xl bg-background">
          <CardHeader className="flex-none bg-primary/5 border-b py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Carrinho
              </CardTitle>
              <Badge variant="secondary" className="rounded-full font-black">{cart.length} itens</Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {cart.map(item => (
                  <div key={item.product_id} className="flex flex-col space-y-2 animate-in fade-in slide-in-from-right-2 duration-200">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold leading-tight">{item.product_name_snapshot}</p>
                        <p className="text-[10px] text-muted-foreground">{formatCurrency(item.unit_price_cents)} un</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive/50 hover:text-destructive"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border rounded-lg h-7 overflow-hidden bg-muted/20">
                        <Button variant="ghost" size="icon" className="h-full w-7 rounded-none" onClick={() => updateQty(item.product_id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-full w-7 rounded-none" onClick={() => updateQty(item.product_id, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <span className="font-bold text-sm">{formatCurrency(item.subtotal_cents)}</span>
                    </div>
                    <Separator className="mt-2" />
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="py-24 text-center space-y-4">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto opacity-10" />
                    <p className="text-xs text-muted-foreground px-12 text-center">Seu carrinho está vazio.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="flex-none flex flex-col p-6 space-y-4 bg-primary/5 border-t">
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-3xl font-black text-primary tracking-tighter">
                <span>Total</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <Button 
              className="w-full h-14 text-lg font-black shadow-xl"
              disabled={cart.length === 0 || isSubmitting}
              onClick={() => setIsFinalizing(true)}
            >
              Finalizar Venda
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isFinalizing} onOpenChange={setIsFinalizing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
            <DialogDescription>Selecione como o cliente irá pagar o valor de <span className="font-black text-primary">{formatCurrency(cartTotal)}</span>.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4">
            <Button 
              variant="outline" 
              className="h-16 justify-start text-lg gap-4 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleFinalize('cash')}
              disabled={isSubmitting}
            >
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Coins className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold">Dinheiro</span>
                <span className="text-[10px] text-muted-foreground">Pagamento em espécie</span>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-16 justify-start text-lg gap-4 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleFinalize('pix')}
              disabled={isSubmitting}
            >
              <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-cyan-600" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold">PIX</span>
                <span className="text-[10px] text-muted-foreground">Transferência instantânea</span>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-16 justify-start text-lg gap-4 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleFinalize('card')}
              disabled={isSubmitting}
            >
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold">Cartão</span>
                <span className="text-[10px] text-muted-foreground">Débito ou Crédito</span>
              </div>
            </Button>
          </div>

          {isSubmitting && (
            <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center rounded-lg z-50 animate-in fade-in duration-200">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="font-black text-sm uppercase tracking-widest">Processando Transação...</p>
            </div>
          )}

          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="ghost" onClick={() => setIsFinalizing(false)} disabled={isSubmitting}>
              Voltar ao carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
