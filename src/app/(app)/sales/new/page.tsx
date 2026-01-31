
'use client';

/**
 * @fileOverview Tela de Nova Venda / PDV.
 * 
 * Interface otimizada que delega a finalização para o AuthProvider (Server Action).
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
  const { products, addSale, store } = useAuth();
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
    
    // Verificação de segurança local
    if (!store?.id) {
      toast({ variant: 'destructive', title: 'Contexto Indisponível', description: 'O portal ainda está carregando os dados da sua loja.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addSale(cart, method);
      
      toast({ 
        title: 'Venda Concluída!', 
        description: `Total de ${formatCurrency(cartTotal)} registrado.` 
      });
      
      setCart([]);
      setIsFinalizing(false);
      router.push('/sales');
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Transação',
        description: error.message || 'Erro de comunicação com o servidor.'
      });
    } finally {
      setIsSubmitting(false);
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
        
        {/* Catálogo de Produtos */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <Card className="flex-none">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filtrar produtos..." 
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
                  className="group cursor-pointer hover:border-primary transition-all active:scale-95"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-bold text-sm leading-tight line-clamp-2 h-10">{product.name}</h3>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-primary font-black text-sm">{formatCurrency(product.price_cents)}</span>
                      <Badge variant="outline" className="text-[9px] px-1 h-4">
                        {product.stock_qty} un
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center text-muted-foreground">
                  Nenhum produto disponível para venda.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Carrinho de Compras */}
        <Card className="flex flex-col h-full border-primary/20 shadow-2xl">
          <CardHeader className="flex-none bg-primary/5 border-b py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Resumo
              </CardTitle>
              <Badge variant="secondary" className="rounded-full">{cart.length} itens</Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {cart.map(item => (
                  <div key={item.product_id} className="flex flex-col space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-bold leading-tight">{item.product_name_snapshot}</p>
                        <p className="text-[10px] text-muted-foreground">{formatCurrency(item.unit_price_cents)}/un</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.product_id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border rounded h-7">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <span className="font-bold text-sm">{formatCurrency(item.subtotal_cents)}</span>
                    </div>
                    <Separator className="mt-2" />
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="py-24 text-center text-muted-foreground text-xs">
                    Adicione produtos ao carrinho.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="flex-none flex flex-col p-6 space-y-4 bg-primary/5 border-t">
            <div className="w-full flex justify-between items-end">
              <span className="text-muted-foreground text-xs uppercase font-bold">Total a Pagar</span>
              <span className="text-3xl font-black text-primary tracking-tighter">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <Button 
              className="w-full h-14 text-lg font-black"
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
            <DialogTitle>Pagamento</DialogTitle>
            <DialogDescription>Selecione o método para o total de <span className="font-bold text-primary">{formatCurrency(cartTotal)}</span>.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4">
            <Button 
              variant="outline" 
              className="h-16 justify-start text-lg gap-4"
              onClick={() => handleFinalize('cash')}
              disabled={isSubmitting}
            >
              <Coins className="h-6 w-6 text-green-600" />
              Dinheiro
            </Button>

            <Button 
              variant="outline" 
              className="h-16 justify-start text-lg gap-4"
              onClick={() => handleFinalize('pix')}
              disabled={isSubmitting}
            >
              <PiggyBank className="h-6 w-6 text-cyan-600" />
              PIX
            </Button>

            <Button 
              variant="outline" 
              className="h-16 justify-start text-lg gap-4"
              onClick={() => handleFinalize('card')}
              disabled={isSubmitting}
            >
              <CreditCard className="h-6 w-6 text-blue-600" />
              Cartão
            </Button>
          </div>

          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg z-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p className="text-sm font-bold">Processando Venda...</p>
            </div>
          )}

          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="ghost" onClick={() => setIsFinalizing(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
