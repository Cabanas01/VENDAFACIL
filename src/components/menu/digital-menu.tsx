'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Product, TableInfo, Store, CartItem } from '@/lib/types';
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Search, 
  ChevronRight, 
  CheckCircle2,
  Loader2,
  X,
  UtensilsCrossed
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export function DigitalMenu({ table, comandaId, store }: { table: TableInfo; comandaId: string; store: Store }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSending, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      setProducts(data || []);
      setLoading(false);
    }
    loadProducts();
  }, [store.id]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category || 'Geral')));
    return cats;
  }, [products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal_cents, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id 
          ? { ...i, quantity: i.quantity + 1, subtotal_cents: (i.quantity + 1) * i.unit_price_cents } 
          : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name_snapshot: product.name,
        quantity: 1,
        unit_price_cents: product.price_cents,
        subtotal_cents: product.price_cents,
        stock_qty: product.stock_qty
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.product_id === productId 
          ? { ...i, quantity: i.quantity - 1, subtotal_cents: (i.quantity - 1) * i.unit_price_cents } 
          : i
        );
      }
      return prev.filter(i => i.product_id !== productId);
    });
  };

  const handleSendOrder = async () => {
    if (cart.length === 0 || isSending) return;
    setIsSubmitting(true);

    try {
      const items = cart.map(i => ({
        product_id: i.product_id,
        qty: i.quantity,
        price: i.unit_price_cents,
        notes: i.notes || ''
      }));

      const { error } = await supabase.rpc('add_itens_from_table_link', {
        p_comanda_id: comandaId,
        p_items: items
      });

      if (error) throw error;

      toast({
        title: 'Pedido Recebido!',
        description: 'Seus itens já foram enviados para a produção.',
      });

      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no Pedido',
        description: err.message || 'Falha ao enviar itens. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* Header Fixo */}
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl border border-primary/10 shadow-inner">
            <AvatarImage src={store.logo_url} />
            <AvatarFallback className="bg-primary text-white font-black text-xs">VF</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black font-headline uppercase tracking-tighter leading-none">{store.name}</h1>
            <span className="text-[10px] font-black uppercase text-primary mt-1 tracking-widest">Mesa #{table.table_number}</span>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-100 font-black text-[10px] uppercase h-6">
          Online
        </Badge>
      </header>

      {/* Busca e Filtros */}
      <div className="p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="O que você deseja pedir?" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-14 pl-12 rounded-2xl border-none shadow-xl shadow-slate-200/50 text-base"
          />
        </div>

        {/* Lista de Produtos Agrupada */}
        <div className="space-y-10">
          {categories.map(cat => {
            const catProducts = filteredProducts.filter(p => (p.category || 'Geral') === cat);
            if (catProducts.length === 0) return null;

            return (
              <section key={cat} className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 pl-1">{cat}</h3>
                <div className="grid gap-4">
                  {catProducts.map(product => {
                    const cartItem = cart.find(i => i.product_id === product.id);
                    return (
                      <Card 
                        key={product.id} 
                        className="border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98] overflow-hidden group"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-0 flex h-28">
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div className="space-y-1">
                              <h4 className="font-black text-sm uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h4>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{product.prep_time_minutes} min preparo</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-primary font-black text-lg tracking-tighter">{formatCurrency(product.price_cents)}</span>
                              {cartItem ? (
                                <div className="flex items-center gap-3 bg-primary text-white rounded-full px-1.5 py-1.5 shadow-lg shadow-primary/20">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-6 w-6 rounded-full hover:bg-white/20 text-white" 
                                    onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-xs font-black w-4 text-center">{cartItem.quantity}</span>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-6 w-6 rounded-full hover:bg-white/20 text-white" 
                                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                  <Plus className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Rodapé do Carrinho Flutuante */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-8 inset-x-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <Button 
            className="w-full h-16 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/40 gap-4 flex justify-between px-8"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span>Ver meu pedido</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="opacity-50 font-bold">Total:</span>
              <span className="text-base">{formatCurrency(cartTotal)}</span>
            </div>
          </Button>
        </div>
      )}

      {/* Modal do Carrinho (Visualização do Pedido) */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-white rounded-t-[40px] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">Meu Pedido</h2>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Confirme os itens abaixo</p>
              </div>
              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-slate-100" onClick={() => setIsCartOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-8 py-6">
              <div className="space-y-6">
                {cart.map(item => (
                  <div key={item.product_id} className="flex justify-between items-center group">
                    <div className="flex-1">
                      <h5 className="font-black text-sm uppercase tracking-tight">{item.product_name_snapshot}</h5>
                      <p className="text-[10px] font-bold text-muted-foreground">{formatCurrency(item.unit_price_cents)} unid.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-slate-100 rounded-xl h-10 px-1 shadow-inner">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => removeFromCart(item.product_id)}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => addToCart(products.find(p => p.id === item.product_id)!)}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                      <span className="font-black text-sm text-primary w-20 text-right">{formatCurrency(item.subtotal_cents)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-8 bg-slate-50 border-t space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Valor total deste envio</span>
                <span className="text-4xl font-black tracking-tighter text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              <Button 
                className="w-full h-20 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 rounded-2xl active:scale-95 transition-all"
                onClick={handleSendOrder}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mr-3" /> Processando...
                  </>
                ) : (
                  <>
                    Enviar para Cozinha <ChevronRight className="ml-3 h-6 w-6" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Estado Vazio */}
      {!loading && products.length === 0 && (
        <div className="py-40 flex flex-col items-center justify-center text-center px-10 space-y-6 opacity-30">
          <UtensilsCrossed className="h-20 w-20" />
          <p className="font-black uppercase tracking-widest text-sm">O cardápio está sendo atualizado...</p>
        </div>
      )}
    </div>
  );
}
