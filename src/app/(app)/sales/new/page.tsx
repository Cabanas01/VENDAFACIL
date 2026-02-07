
'use client';

/**
 * @fileOverview Terminal de Vendas (PDV) v6.5
 * Checkout de alta performance com suporte a leitor de código de barras e gestão de centavos.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
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
  CreditCard,
  Barcode,
  Package,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Product, CartItem } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function NewSalePDVPage() {
  const { products, store, refreshStatus, cashSessions } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pix' | 'card' | ''>('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 🔥 Verificação de Caixa Aberto
  const isCashOpen = useMemo(() => 
    (cashSessions || []).some(s => s.status === 'open'), 
  [cashSessions]);

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    const safeProducts = Array.isArray(products) ? products : [];
    return safeProducts.filter(p => p.is_active !== false && (
      (p.name || '').toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term))
    ));
  }, [products, search]);

  const cartTotalCents = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.unit_price_cents * item.qty), 0), 
  [cart]);

  const addToCart = (product: Product) => {
    if (!isCashOpen) {
      toast({ variant: 'destructive', title: 'Caixa Fechado', description: 'Abra o caixa antes de realizar vendas.' });
      return;
    }

    const existing = cart.find(item => item.product_id === product.id);
    
    if ((product.stock_quantity || 0) <= (existing?.qty || 0)) {
      toast({ variant: 'destructive', title: 'Estoque Insuficiente', description: `Apenas ${product.stock_quantity} un disponíveis.` });
      return;
    }

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
        stock_quantity: product.stock_quantity
      }]);
    }
    
    setSearch('');
    searchInputRef.current?.focus();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = item.qty + delta;
        const product = products.find(p => p.id === productId);
        
        if (delta > 0 && (product?.stock_quantity || 0) <= item.qty) {
          toast({ variant: 'destructive', title: 'Limite de estoque atingido' });
          return item;
        }
        
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setCart(cart.filter(i => i.product_id !== productId));
  };

  const handleFinalize = async () => {
    if (!cart.length || !paymentMethod || !store?.id || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 1. Criar registro de venda
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .insert({
          store_id: store.id,
          total_cents: cartTotalCents,
          payment_method: paymentMethod,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saleErr) throw saleErr;

      // 2. Inserir itens da venda
      const itemsPayload = cart.map(item => ({
        sale_id: sale.id,
        store_id: store.id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        quantity: item.qty,
        unit_price: item.unit_price_cents,
        line_total: item.qty * item.unit_price_cents
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      // 3. Atualizar estoque (Frontend local + Sincronização)
      // Nota: Idealmente isso seria feito via RPC ou Trigger para garantir atomicidade
      for (const item of cart) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase.from('products')
            .update({ stock_quantity: (product.stock_quantity || 0) - item.qty })
            .eq('id', product.id);
        }
      }

      toast({ title: 'Venda Concluída!', description: `Total: ${formatCurrency(cartTotalCents)}` });
      
      // Limpar estado
      setCart([]);
      setPaymentMethod('');
      setIsFinalizing(false);
      
      // Sincronizar dados globais
      await refreshStatus();
      router.push('/sales');
    } catch (error: any) {
      console.error('[FINALIZE_SALE_ERROR]', error);
      toast({ variant: 'destructive', title: 'Erro ao processar venda', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="mb-6 flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-black uppercase tracking-tighter">Frente de Caixa</h1>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.3em]">Operação Direta de Balcão</p>
        </div>
        
        {!isCashOpen && (
          <div className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-bounce">
            <AlertCircle className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Caixa Fechado</span>
            <Button size="sm" variant="destructive" className="h-7 text-[9px] font-black uppercase" onClick={() => router.push('/cash')}>Abrir agora</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* LADO ESQUERDO: BUSCA E LISTAGEM */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
          <Card className="bg-background border-none shadow-sm shrink-0">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  ref={searchInputRef}
                  placeholder="Pesquisar produto ou bipar código..." 
                  className="pl-12 h-14 text-lg bg-slate-50 border-none shadow-inner rounded-2xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={!isCashOpen}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 opacity-40">
                  <Barcode className="h-5 w-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Scanner Ativo</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1 rounded-[32px] border bg-background/50">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
              {filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className={cn(
                    "cursor-pointer hover:border-primary transition-all active:scale-[0.98] shadow-sm border-primary/5 bg-background h-40 group",
                    (product.stock_quantity || 0) <= 0 && "opacity-60 grayscale"
                  )}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-none p-0 text-muted-foreground">{product.category || 'GERAL'}</Badge>
                      <h3 className="font-black text-[11px] leading-tight line-clamp-2 uppercase tracking-tighter group-hover:text-primary transition-colors">{product.name}</h3>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-primary font-black text-xl tracking-tighter">{formatCurrency(product.price_cents)}</span>
                      <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-300">
                        <Package className="h-3 w-3" /> {product.stock_quantity || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-32 text-center opacity-30 space-y-4">
                  <Package className="h-12 w-12 mx-auto" />
                  <p className="font-black uppercase text-[10px] tracking-widest">Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* LADO DIREITO: CARRINHO E TOTAL */}
        <Card className="flex flex-col h-full border-primary/10 shadow-2xl overflow-hidden rounded-[40px] bg-background">
          <CardHeader className="p-6 bg-muted/20 border-b border-muted/50 flex-none">
            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest">
              <ShoppingCart className="h-5 w-5 text-primary" /> Checkout Ativo
            </CardTitle>
          </CardHeader>

          <ScrollArea className="flex-1">
            <div className="p-8 space-y-6">
              {cart.map(item => (
                <div key={item.product_id} className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase leading-tight tracking-tight">{item.product_name_snapshot}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{formatCurrency(item.unit_price_cents)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 rounded-full hover:bg-red-50" onClick={() => removeItem(item.product_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQty(item.product_id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-10 text-center text-xs font-black">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQty(item.product_id, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <span className="font-black text-sm">{formatCurrency(item.qty * item.unit_price_cents)}</span>
                  </div>
                  <Separator className="opacity-30" />
                </div>
              ))}
              
              {cart.length === 0 && (
                <div className="py-40 text-center space-y-6 opacity-20">
                  <ShoppingCart className="h-16 w-16 mx-auto text-primary" />
                  <p className="text-[11px] font-black uppercase tracking-[0.25em]">Aguardando Produtos</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardFooter className="flex-none flex flex-col p-10 space-y-8 bg-slate-50/50 border-t border-muted/50">
            <div className="w-full flex justify-between items-end">
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">TOTAL À PAGAR</span>
              <span className="text-5xl font-black text-primary tracking-tighter">{formatCurrency(cartTotalCents)}</span>
            </div>
            
            <Button 
              className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 rounded-[24px]"
              disabled={cart.length === 0 || !isCashOpen}
              onClick={() => setIsFinalizing(true)}
            >
              FECHAR VENDA <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* DIÁLOGO DE FINALIZAÇÃO */}
      <Dialog open={isFinalizing} onOpenChange={setIsFinalizing}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[40px]">
          <div className="p-10 bg-white relative">
            <button onClick={() => setIsFinalizing(false)} className="absolute right-8 top-8 h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-6 w-6" />
            </button>
            
            <div className="mb-10 pt-6 text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 font-headline">FORMA DE RECEBIMENTO</h2>
              <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Valor consolidado: {formatCurrency(cartTotalCents)}</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Button 
                variant="outline" 
                className={cn(
                  "h-20 justify-start gap-6 border-none rounded-[24px] px-8 transition-all",
                  paymentMethod === 'cash' ? "bg-green-600 text-white shadow-lg" : "bg-slate-50 hover:bg-slate-100"
                )}
                onClick={() => setPaymentMethod('cash')}
              >
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shadow-inner", paymentMethod === 'cash' ? "bg-white/20" : "bg-green-100")}>
                  <CircleDollarSign className={cn("h-6 w-6", paymentMethod === 'cash' ? "text-white" : "text-green-600")} />
                </div>
                <span className="font-black uppercase text-[11px] tracking-[0.2em]">DINHEIRO</span>
              </Button>

              <Button 
                className={cn(
                  "h-20 justify-start gap-6 border-none rounded-[24px] px-8 transition-all",
                  paymentMethod === 'pix' ? "bg-cyan-600 text-white shadow-lg" : "bg-slate-50 hover:bg-slate-100 text-slate-900"
                )}
                onClick={() => setPaymentMethod('pix')}
              >
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shadow-inner", paymentMethod === 'pix' ? "bg-white/20" : "bg-cyan-100")}>
                  <QrCode className={cn("h-6 w-6", paymentMethod === 'pix' ? "text-white" : "text-cyan-600")} />
                </div>
                <span className="font-black uppercase text-[11px] tracking-[0.2em]">PIX QR CODE</span>
              </Button>

              <Button 
                variant="outline" 
                className={cn(
                  "h-20 justify-start gap-6 border-none rounded-[24px] px-8 transition-all",
                  paymentMethod === 'card' ? "bg-blue-600 text-white shadow-lg" : "bg-slate-50 hover:bg-slate-100"
                )}
                onClick={() => setPaymentMethod('card')}
              >
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shadow-inner", paymentMethod === 'card' ? "bg-white/20" : "bg-blue-100")}>
                  <CreditCard className={cn("h-6 w-6", paymentMethod === 'card' ? "text-white" : "text-blue-600")} />
                </div>
                <span className="font-black uppercase text-[11px] tracking-[0.2em]">CARTÃO</span>
              </Button>
            </div>

            <Button 
              className="w-full h-16 mt-10 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
              disabled={!paymentMethod || isSubmitting}
              onClick={handleFinalize}
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'CONCLUIR RECEBIMENTO'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
