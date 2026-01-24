'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, PlusCircle, MinusCircle, Trash2, X, CreditCard, Coins, PiggyBank } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/components/auth-provider';
import type { Product, Sale, SaleItem } from '@/lib/types';

type CartItem = Omit<SaleItem, 'id' | 'saleId'> & { stock_qty: number };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { products, addSale } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(
      p => p.active && p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal_cents, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    const stockAvailable = product.stock_qty > (existingItem?.quantity ?? 0);
    
    if (!stockAvailable) {
      toast({ variant: 'destructive', title: 'Estoque insuficiente', description: `Não há mais unidades de ${product.name} em estoque.` });
      return;
    }

    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        productId: product.id,
        product_name_snapshot: product.name,
        quantity: 1,
        unit_price_cents: product.price_cents,
        subtotal_cents: product.price_cents,
        stock_qty: product.stock_qty,
      }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
      return;
    }

    const item = cart.find(item => item.productId === productId);
    const product = products.find(p => p.id === productId);
    if (!item || !product) return;

    if (newQuantity > product.stock_qty) {
      toast({ variant: 'destructive', title: 'Estoque insuficiente' });
      return;
    }

    setCart(cart.map(item => 
      item.productId === productId 
      ? { ...item, quantity: newQuantity, subtotal_cents: item.unit_price_cents * newQuantity }
      : item
    ));
  };
  
  const handleFinalizeSale = async (paymentMethod: 'cash' | 'pix' | 'card') => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Carrinho vazio' });
      return;
    }

    const payload = {
      created_at: new Date().toISOString(),
      payment_method: paymentMethod,
      total_cents: cartTotal,
      items: cart.map((item) => ({
        productId: item.productId,
        product_name_snapshot: item.product_name_snapshot,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        subtotal_cents: item.subtotal_cents,
      })),
    };

    const { ok, error } = await addSale(payload);

    if (!ok) {
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar venda',
        description: error || 'Não foi possível concluir a venda.',
      });
      return;
    }

    toast({
      title: 'Venda realizada com sucesso!',
      description: `Total: ${formatCurrency(cartTotal)}`,
    });

    setCart([]);
    setIsConfirming(false);
    router.push('/sales');
  };

  return (
    <>
      <PageHeader title="Nova Venda / PDV" subtitle="Selecione os produtos e finalize a venda." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Product Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar produto por nome..." 
                  className="pl-10" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <Card key={product.id} className="flex flex-col">
                      <CardContent className="p-3 flex-1 flex flex-col justify-between">
                         <div>
                            <p className="font-semibold text-sm leading-tight">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(product.price_cents)}</p>
                         </div>
                         <Badge variant={product.stock_qty > 0 ? 'outline' : 'destructive'} className="mt-2 text-xs w-fit">
                            Estoque: {product.stock_qty}
                        </Badge>
                      </CardContent>
                      <CardFooter className="p-0">
                        <Button 
                          className="w-full rounded-t-none" 
                          size="sm"
                          onClick={() => addToCart(product)}
                          disabled={product.stock_qty <= (cart.find(i => i.productId === product.id)?.quantity ?? 0)}
                        >
                          Adicionar
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div className="sticky top-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><ShoppingCart /> Carrinho</CardTitle>
              {cart.length > 0 && (
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCart([])}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                 </Button>
              )}
            </CardHeader>
            <CardContent>
              {cart.length > 0 ? (
                <ScrollArea className="h-64 pr-4">
                    <div className="space-y-4">
                    {cart.map(item => (
                        <div key={item.productId} className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-sm">{item.product_name_snapshot}</p>
                                <p className="text-muted-foreground text-sm">{formatCurrency(item.unit_price_cents)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)}><MinusCircle className="h-4 w-4" /></Button>
                                <span>{item.quantity}</span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
                            </div>
                            <p className="font-medium w-16 text-right">{formatCurrency(item.subtotal_cents)}</p>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground text-center">Seu carrinho está vazio.</p>
                </div>
              )}
            </CardContent>
            <Separator />
            <CardFooter className="flex flex-col gap-4 pt-4">
                <div className="w-full flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotal)}</span>
                </div>
                <Button className="w-full" size="lg" onClick={() => setIsConfirming(true)} disabled={cart.length === 0}>
                    Finalizar Venda
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar a venda?</AlertDialogTitle>
            <AlertDialogDescription>
              O total da compra é de <span className="font-bold">{formatCurrency(cartTotal)}</span>. Selecione a forma de pagamento para concluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
              <Button variant="outline" size="lg" onClick={() => handleFinalizeSale('cash')}>
                  <Coins className="mr-2" /> Dinheiro
              </Button>
               <Button variant="outline" size="lg" onClick={() => handleFinalizeSale('pix')}>
                  <PiggyBank className="mr-2" /> Pix
              </Button>
               <Button variant="outline" size="lg" onClick={() => handleFinalizeSale('card')}>
                  <CreditCard className="mr-2" /> Cartão
              </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
