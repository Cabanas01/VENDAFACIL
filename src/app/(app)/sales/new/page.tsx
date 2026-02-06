'use client';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import type { Product, CartItem, Sale } from '@/lib/types';
import { printReceipt } from '@/lib/print-receipt';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function NewSalePage() {
  const { products, addSaleBalcao, store } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    return (products || []).filter(p => 
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
        stock_qty: product.stock_qty,
        destino_preparo: product.production_target || 'nenhum'
      }]);
    }
  };

  const handleFinalize = async (method: string) => {
    if (cart.length === 0 || isSubmitting || !store) return;

    setIsSubmitting(true);
    try {
      // O addSaleBalcao orquestra as RPCs oficiais na ordem correta
      const result = await addSaleBalcao(cart, method);
      if (result) {
        toast({ title: 'Venda Concluída!' });
        printReceipt(result, store);
        setCart([]);
        setIsFinalizing(false);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Falha ao processar venda', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-black uppercase tracking-tighter">FRENTE DE CAIXA</h1>
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Venda Rápida de Balcão</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
          <Card className="bg-background border-none shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar por nome ou código..." 
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
                  className="cursor-pointer hover:border-primary transition-all active:scale-[0.98] shadow-sm border-primary/5 bg-background h-36"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full text-left">
                    <h3 className="font-black text-[11px] leading-tight line-clamp-2 uppercase tracking-tighter">{product.name}</h3>
                    <div className="flex items-end justify-between">
                      <span className="text-primary font-black text-xl tracking-tighter">{formatCurrency(product.price_cents)}</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase">{product.stock_qty} UN</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Card className="flex flex-col h-full border-primary/10 shadow-2xl overflow-hidden rounded-[40px] bg-background">
          <CardHeader className="p-6 bg-muted/20 border-b border-muted">
            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest">
              <ShoppingCart className="h-5 w-5 text-primary" /> Carrinho de Compras
            </CardTitle>
          </CardHeader>

          <ScrollArea className="flex-1">
            <div className="p-8 space-y-8">
              {cart.map(item => (
                <div key={item.product_id} className="flex flex-col space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase leading-tight tracking-tight">{item.product_name_snapshot}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 opacity-60">{formatCurrency(item.unit_price_cents)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 rounded-full" onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-slate-100/50 rounded-2xl p-1 border border-slate-200/50">
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
                        const newQty = item.qty - 1;
                        if (newQty < 1) setCart(cart.filter(i => i.product_id !== item.product_id));
                        else setCart(cart.map(i => i.product_id === item.product_id ? {...i, qty: newQty, subtotal_cents: newQty * i.unit_price_cents} : i));
                      }}><Minus className="h-4 w-4" /></Button>
                      <span className="w-12 text-center text-sm font-black">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
                        if (item.qty >= item.stock_qty) return;
                        const newQty = item.qty + 1;
                        setCart(cart.map(i => i.product_id === item.product_id ? {...i, qty: newQty, subtotal_cents: newQty * i.unit_price_cents} : i));
                      }}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <span className="font-black text-lg text-slate-950 tracking-tighter">{formatCurrency(item.subtotal_cents)}</span>
                  </div>
                  <Separator className="opacity-30" />
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-40 text-center space-y-6 opacity-20">
                  <ShoppingCart className="h-16 w-16 mx-auto" />
                  <p className="text-[11px] font-black uppercase tracking-[0.25em]">CARRINHO VAZIO</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardFooter className="flex-none flex flex-col p-10 space-y-8 bg-slate-50/50 border-t border-muted/50">
            <div className="w-full flex justify-between items-end">
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">TOTAL A RECEBER</span>
              <span className="text-5xl font-black text-primary tracking-tighter">{formatCurrency(cartTotal)}</span>
            </div>
            <Button 
              className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 rounded-[24px]"
              disabled={cart.length === 0 || isSubmitting}
              onClick={() => setIsFinalizing(true)}
            >
              FINALIZAR VENDA <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isFinalizing} onOpenChange={setIsFinalizing}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[40px]">
          <div className="p-10 bg-white relative">
            <button 
              onClick={() => setIsFinalizing(false)}
              className="absolute right-8 top-8 h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="mb-12 pt-6 text-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 font-headline">PAGAMENTO</h2>
              <DialogDescription className="text-xs uppercase font-bold tracking-widest text-muted-foreground mt-2">Selecione o meio de recebimento</DialogDescription>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              <Button 
                variant="outline" 
                className="h-24 justify-start text-[11px] font-black uppercase tracking-[0.2em] gap-8 border-none bg-slate-50 shadow-sm hover:bg-slate-100 transition-all px-10 rounded-[32px] group" 
                onClick={() => handleFinalize('cash')} 
                disabled={isSubmitting}
              >
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center shrink-0 shadow-inner group-active:scale-95 transition-transform">
                  <Coins className="h-8 w-8 text-green-600" />
                </div>
                <span>DINHEIRO EM ESPÉCIE</span>
              </Button>

              <Button 
                className="h-24 justify-start text-[11px] font-black uppercase tracking-[0.2em] gap-8 border-none bg-cyan-400 text-white shadow-2xl shadow-cyan-400/30 hover:bg-cyan-500 transition-all px-10 rounded-[32px] group" 
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
                onClick={() => handleFinalize('card')} 
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
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
              <Loader2 className="h-14 w-14 animate-spin text-primary mb-6" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">PROCESSANDO...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
