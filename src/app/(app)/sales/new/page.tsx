
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2, 
  ArrowRight,
  X,
  QrCode,
  UserCircle,
  CircleDollarSign,
  CreditCard 
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import type { Product, CartItem } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function NewSalePDVPage() {
  const { products, getOrCreateComanda, adicionarItem, finalizarAtendimento } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    return (products || []).filter(p => 
      p && p.active && (
        (p.name || '').toLowerCase().includes(term) || 
        (p.barcode || '').includes(term)
      )
    );
  }, [products, search]);

  const cartTotalDisplay = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.unit_price_cents * item.qty), 0), 
  [cart]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product_id === product.id 
        ? { ...item, qty: item.qty + 1 } 
        : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name_snapshot: product.name,
        qty: 1,
        unit_price_cents: product.price_cents,
        stock_qty: product.stock_qty
      }]);
    }
  };

  const handleFinalize = async (method: 'cash' | 'pix' | 'card') => {
    if (cart.length === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // PDV = Mesa 0. O customerName agora é passado apenas se o backend suportar, 
      // ou atualizado via meta-dados se necessário. Para este fluxo, usamos table_number 0.
      const comandaId = await getOrCreateComanda(0, customerName || 'Consumidor Balcão');
      
      for (const item of cart) {
        await adicionarItem(comandaId, item.product_id, Number(item.qty));
      }
      
      await finalizarAtendimento(comandaId, method);
      
      toast({ title: 'Venda Finalizada!', description: `Total: ${formatCurrency(cartTotalDisplay)}` });
      setCart([]);
      setIsFinalizing(false);
      router.push('/sales');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Falha no PDV', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="mb-6 flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black uppercase tracking-tighter">FRENTE DE CAIXA</h1>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.3em]">Operação Balcão Ativa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
          <Card className="bg-background border-none shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar por nome ou código de barras..." 
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
                  className="cursor-pointer hover:border-primary transition-all active:scale-[0.98] shadow-sm border-primary/5 bg-background h-36 group"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full text-left">
                    <h3 className="font-black text-[11px] leading-tight line-clamp-2 uppercase tracking-tighter group-hover:text-primary transition-colors">{product.name}</h3>
                    <div className="flex items-end justify-between">
                      <span className="text-primary font-black text-xl tracking-tighter">{formatCurrency(product.price_cents)}</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase">{product.stock_qty} UN</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Card className="flex flex-col h-full border-primary/10 shadow-2xl overflow-hidden rounded-[40px] bg-background">
          <CardHeader className="p-6 bg-muted/20 border-b border-muted/50">
            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest">
              <ShoppingCart className="h-5 w-5 text-primary" /> Checkout Rápido
            </CardTitle>
          </CardHeader>

          <ScrollArea className="flex-1">
            <div className="p-8 space-y-8">
              {cart.map(item => (
                <div key={item.product_id} className="flex flex-col space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase leading-tight tracking-tight">{item.product_name_snapshot}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{formatCurrency(item.unit_price_cents)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 rounded-full hover:bg-red-50" onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        const newQty = item.qty - 1;
                        if (newQty < 1) setCart(cart.filter(i => i.product_id !== item.product_id));
                        else setCart(cart.map(i => i.product_id === item.product_id ? {...i, qty: newQty} : i));
                      }}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setCart(cart.map(i => i.product_id === item.product_id ? {...i, qty: i.qty + 1} : i));
                      }}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <span className="font-black text-sm text-slate-950">{formatCurrency(item.qty * item.unit_price_cents)}</span>
                  </div>
                  <Separator className="opacity-30" />
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-40 text-center space-y-6 opacity-20">
                  <ShoppingCart className="h-16 w-16 mx-auto text-primary" />
                  <p className="text-[11px] font-black uppercase tracking-[0.25em]">Carrinho Vazio</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardFooter className="flex-none flex flex-col p-10 space-y-8 bg-slate-50/50 border-t border-muted/50">
            <div className="w-full flex justify-between items-end">
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">TOTAL À RECEBER</span>
              <span className="text-5xl font-black text-primary tracking-tighter">{formatCurrency(cartTotalDisplay)}</span>
            </div>
            <Button 
              className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 rounded-[24px]"
              disabled={cart.length === 0 || isSubmitting}
              onClick={() => setIsFinalizing(true)}
            >
              FECHAR VENDA <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isFinalizing} onOpenChange={setIsFinalizing}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[40px]">
          <div className="p-10 bg-white relative">
            <button onClick={() => setIsFinalizing(false)} className="absolute right-8 top-8 h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-6 w-6" />
            </button>
            
            <div className="mb-10 pt-6 text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 font-headline">PAGAMENTO BALCÃO</h2>
              <DialogDescription className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Total: {formatCurrency(cartTotalDisplay)}</DialogDescription>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-2">CLIENTE (OPCIONAL)</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
                  <input 
                    placeholder="Identificar consumidor..." 
                    className="w-full h-14 pl-12 rounded-2xl border border-slate-200 bg-white font-bold text-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <Button variant="outline" className="h-20 justify-start gap-6 border-none bg-slate-50 hover:bg-slate-100 rounded-[24px] px-8" onClick={() => handleFinalize('cash')} disabled={isSubmitting}>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shadow-inner"><CircleDollarSign className="text-green-600 h-6 w-6" /></div>
                  <span className="font-black uppercase text-[11px] tracking-[0.2em]">DINHEIRO</span>
                </Button>

                <Button className="h-20 justify-start gap-6 border-none bg-cyan-400 text-white hover:bg-cyan-500 rounded-[24px] px-8 shadow-xl" onClick={() => handleFinalize('pix')} disabled={isSubmitting}>
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center shadow-inner"><QrCode className="h-6 w-6 text-white" /></div>
                  <span className="font-black uppercase text-[11px] tracking-[0.2em]">PIX QR CODE</span>
                </Button>

                <Button variant="outline" className="h-20 justify-start gap-6 border-none bg-slate-50 hover:bg-slate-100 rounded-[24px] px-8" onClick={() => handleFinalize('card')} disabled={isSubmitting}>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shadow-inner"><CreditCard className="h-6 w-6 text-blue-600" /></div>
                  <span className="font-black uppercase text-[11px] tracking-[0.2em]">CARTÃO</span>
                </Button>
              </div>
            </div>
          </div>

          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
              <Loader2 className="h-14 w-14 animate-spin text-primary mb-6" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em]">Sincronizando...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
