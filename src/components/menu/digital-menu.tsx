
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
  Loader2,
  X,
  UtensilsCrossed,
  Clock,
  UserCheck,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

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
  
  // Estados de Identificação do Cliente
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [customerData, setCustomerData] = useState({ name: '', phone: '', cpf: '' });

  useEffect(() => {
    // 1. Carregar produtos
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

    // 2. Verificar identificação prévia no localStorage
    const savedCustomerId = localStorage.getItem(`vf_customer_${comandaId}`);
    if (savedCustomerId) {
      setCustomerId(savedCustomerId);
    }

    loadProducts();
  }, [store.id, comandaId]);

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
        stock_qty: product.stock_qty,
        notes: ''
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

  const updateItemNotes = (productId: string, notes: string) => {
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, notes } : i));
  };

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerData.name || !customerData.phone || isIdentifying) return;

    setIsIdentifying(true);
    try {
      const { data, error } = await supabase.rpc('register_customer_on_table', {
        p_comanda_id: comandaId,
        p_name: customerData.name,
        p_phone: customerData.phone,
        p_cpf: customerData.cpf || null
      });

      if (error) throw error;

      const newId = typeof data === 'string' ? data : (data as any).customer_id;
      setCustomerId(newId);
      localStorage.setItem(`vf_customer_${comandaId}`, newId);
      
      toast({ title: 'Bem-vindo!', description: `Acesso liberado para ${customerData.name}.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro na Identificação', description: err.message });
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleSendOrder = async () => {
    if (!customerId) {
      toast({ variant: 'destructive', title: 'Identificação Necessária', description: 'Por favor, identifique-se antes de pedir.' });
      return;
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground animate-pulse">
          Abrindo Cardápio Digital...
        </p>
      </div>
    );
  }

  // TELA DE IDENTIFICAÇÃO OBRIGATÓRIA
  if (!customerId) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-[32px]">
          <div className="bg-primary/5 p-10 text-center space-y-4 border-b border-primary/10">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary">
              <UserCheck className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Seja Bem-vindo!</h1>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Identificação Obrigatória - Mesa {table.table_number}
              </p>
            </div>
          </div>
          <CardContent className="p-8">
            <form onSubmit={handleRegisterCustomer} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</label>
                  <Input 
                    placeholder="Como podemos te chamar?" 
                    value={customerData.name}
                    onChange={e => setCustomerData({...customerData, name: e.target.value})}
                    className="h-14 font-bold border-muted-foreground/20 rounded-2xl focus-visible:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp / Celular</label>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    value={customerData.phone}
                    onChange={e => setCustomerData({...customerData, phone: e.target.value})}
                    className="h-14 font-bold border-muted-foreground/20 rounded-2xl focus-visible:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF (Opcional)</label>
                  <Input 
                    placeholder="000.000.000-00" 
                    value={customerData.cpf}
                    onChange={e => setCustomerData({...customerData, cpf: e.target.value})}
                    className="h-14 font-bold border-muted-foreground/20 rounded-2xl focus-visible:ring-primary/20"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20"
                disabled={isIdentifying || !customerData.name || !customerData.phone}
              >
                {isIdentifying ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ChevronRight className="mr-2 h-5 w-5" />}
                Liberar Cardápio
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-8 text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-40">
          VendaFácil Brasil - Autoatendimento Seguro
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl border border-primary/10 shadow-inner">
            <AvatarImage src={store.logo_url} />
            <AvatarFallback className="bg-primary text-white font-black text-xs">VF</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black font-headline uppercase tracking-tighter leading-none">{store.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Mesa #{table.table_number}</span>
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[9px] font-bold text-muted-foreground lowercase">@{customerData.name.split(' ')[0] || 'cliente'}</span>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-100 font-black text-[10px] uppercase h-6">
          Online
        </Badge>
      </header>

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
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                                <Clock className="h-2.5 w-2.5" /> {product.prep_time_minutes || 5} min preparo
                              </div>
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

      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-white rounded-t-[40px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">Meu Pedido</h2>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Confirme itens e observações</p>
              </div>
              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-slate-100" onClick={() => setIsCartOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-8 py-6">
              <div className="space-y-8">
                {cart.map(item => (
                  <div key={item.product_id} className="space-y-3 group">
                    <div className="flex justify-between items-center">
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
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input 
                        placeholder="Observações (ex: sem gelo, mal passado...)" 
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.product_id, e.target.value)}
                        className="pl-9 h-10 text-[11px] font-bold border-dashed border-muted-foreground/20 rounded-xl"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-8 bg-slate-50 border-t space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total deste pedido</span>
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
                    Confirmar Pedido <CheckCircle2 className="ml-3 h-6 w-6" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="py-40 flex flex-col items-center justify-center text-center px-10 space-y-6 opacity-30">
          <UtensilsCrossed className="h-20 w-20" />
          <p className="font-black uppercase tracking-widest text-sm">O cardápio está sendo atualizado...</p>
        </div>
      )}
    </div>
  );
}
