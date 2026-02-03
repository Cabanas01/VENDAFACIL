
'use client';

/**
 * @fileOverview Cardápio Digital Profissional (Autoatendimento)
 * 
 * - Identificação obrigatória (CRM)
 * - Pedidos via RPC add_itens_from_table_link
 * - Mobile First & UX Premium
 * - Persistência de identificação para evitar cadastros duplicados na mesma visita.
 */

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
  CheckCircle2,
  AlertCircle
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
  const [cart, setCart] = useState<(CartItem & { notes?: string })[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // Identificação do Cliente
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [customerData, setCustomerData] = useState({ name: '', phone: '', cpf: '' });

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

    // Tenta recuperar identificação anterior desta comanda
    const savedCustomerId = localStorage.getItem(`vf_cust_v3_${comandaId}`);
    if (savedCustomerId) {
      setCustomerId(savedCustomerId);
    }

    loadProducts();
  }, [store.id, comandaId]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category || 'Geral')));
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
      // RPC OBRIGATÓRIA: Registra cliente e vincula à comanda
      const { data, error } = await supabase.rpc('register_customer_on_table', {
        p_comanda_id: comandaId,
        p_name: customerData.name,
        p_phone: customerData.phone,
        p_cpf: customerData.cpf || null
      });

      if (error) throw error;

      // Resposta da RPC pode variar (objeto ou string)
      const resId = typeof data === 'string' ? data : (data as any).customer_id;
      
      setCustomerId(resId);
      localStorage.setItem(`vf_cust_v3_${comandaId}`, resId);
      
      toast({ title: 'Acesso Liberado!', description: `Bom apetite, ${customerData.name.split(' ')[0]}!` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Identificação Recusada', description: err.message });
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleSendOrder = async () => {
    if (!customerId || cart.length === 0 || isSending) return;
    
    setIsSending(true);
    try {
      // Formatação dos itens para o JSONB esperado pela RPC
      const payload = cart.map(i => ({
        product_id: i.product_id,
        qty: i.quantity,
        price: i.unit_price_cents,
        notes: i.notes || ''
      }));

      const { error } = await supabase.rpc('add_itens_from_table_link', {
        p_comanda_id: comandaId,
        p_items: payload
      });

      if (error) throw error;

      setCart([]);
      setIsCartOpen(false);
      setOrderSuccess(true);
      
      // Feedback temporário de sucesso
      setTimeout(() => setOrderSuccess(false), 5000);
      
      toast({ title: 'Pedido Enviado!', description: 'Sua solicitação já está na produção.' });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no Envio',
        description: err.message || 'Falha ao comunicar com a cozinha.',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] tracking-[0.25em] text-muted-foreground animate-pulse text-center">
          Sincronizando<br/>Cardápio Digital...
        </p>
      </div>
    );
  }

  // TELA DE IDENTIFICAÇÃO (BLOQUEIA O CARDÁPIO)
  if (!customerId) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-[32px] animate-in fade-in zoom-in duration-500">
          <div className="bg-primary/5 p-10 text-center space-y-4 border-b border-primary/10">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary ring-8 ring-primary/5">
              <UserCheck className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Identificação</h1>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-8 leading-relaxed">
                Mesa {table.table_number} - Identifique-se para liberar o cardápio
              </p>
            </div>
          </div>
          <CardContent className="p-8">
            <form onSubmit={handleRegisterCustomer} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</label>
                  <Input 
                    placeholder="Como devemos te chamar?" 
                    value={customerData.name}
                    onChange={e => setCustomerData({...customerData, name: e.target.value})}
                    className="h-14 font-bold border-muted-foreground/20 rounded-2xl focus-visible:ring-primary/20 text-base"
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
                className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                disabled={isIdentifying || !customerData.name || !customerData.phone}
              >
                {isIdentifying ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ChevronRight className="mr-2 h-5 w-5" />}
                Confirmar e Ver Produtos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CARDÁPIO LIBERADO
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl border border-primary/10 shadow-inner ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary text-white font-black text-xs">
              {store.name?.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black font-headline uppercase tracking-tighter leading-none">{store.name}</h1>
            <span className="text-[10px] font-black uppercase text-primary tracking-widest mt-1">Mesa #{table.table_number}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 bg-green-50 border-green-100">Autoatendimento</Badge>
      </header>

      <div className="p-6 space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="O que você deseja pedir?" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-14 pl-12 rounded-2xl border-none shadow-xl shadow-slate-200/50 text-base font-medium"
          />
        </div>

        <div className="space-y-12">
          {categories.map(cat => {
            const catProducts = filteredProducts.filter(p => (p.category || 'Geral') === cat);
            if (catProducts.length === 0) return null;

            return (
              <section key={cat} className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pl-1">{cat}</h3>
                <div className="grid gap-4">
                  {catProducts.map(product => {
                    const cartItem = cart.find(i => i.product_id === product.id);
                    return (
                      <Card 
                        key={product.id} 
                        className="border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98] overflow-hidden group bg-white"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-0 flex h-28">
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div className="space-y-1">
                              <h4 className="font-black text-sm uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h4>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                                <Clock className="h-2.5 w-2.5" /> {product.prep_time_minutes || 5} min média
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-primary font-black text-lg tracking-tighter">{formatCurrency(product.price_cents)}</span>
                              {cartItem ? (
                                <div className="flex items-center gap-3 bg-primary text-white rounded-full px-1 py-1 shadow-lg shadow-primary/20">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 rounded-full hover:bg-white/20 text-white" 
                                    onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="text-xs font-black w-4 text-center">{cartItem.quantity}</span>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 rounded-full hover:bg-white/20 text-white" 
                                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all border border-slate-100 shadow-sm">
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

      {/* FEEDBACK DE SUCESSO APÓS PEDIDO */}
      {orderSuccess && (
        <div className="fixed top-24 inset-x-6 z-50 animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="bg-green-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-green-500 ring-8 ring-green-500/10">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Pedido Enviado!</p>
              <p className="text-[10px] font-bold opacity-80 uppercase mt-0.5">Sua solicitação está sendo preparada.</p>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE DO CARRINHO */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-8 inset-x-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <Button 
            className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl shadow-primary/40 gap-4 flex justify-between px-8"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span>Meu Carrinho</span>
            </div>
            <span className="text-base tracking-tighter">{formatCurrency(cartTotal)}</span>
          </Button>
        </div>
      )}

      {/* MODAL DO CARRINHO (FULLSCREEN MOBILE) */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-white rounded-t-[40px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">Meu Pedido</h2>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Confirme seus itens</p>
              </div>
              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-slate-100" onClick={() => setIsCartOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-8 py-6">
              <div className="space-y-10">
                {cart.map(item => (
                  <div key={item.product_id} className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h5 className="font-black text-sm uppercase tracking-tight">{item.product_name_snapshot}</h5>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatCurrency(item.unit_price_cents)}/un</p>
                      </div>
                      <div className="flex items-center bg-slate-50 rounded-xl h-10 p-1 border border-slate-100">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.product_id)}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addToCart(products.find(p => p.id === item.product_id)!)}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground/30" />
                      <Input 
                        placeholder="Ex: sem gelo, mal passado..." 
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.product_id, e.target.value)}
                        className="pl-9 h-10 text-[11px] font-bold border-dashed border-muted-foreground/20 rounded-xl bg-slate-50/50 focus-visible:ring-primary/10"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-8 bg-slate-50 border-t space-y-6">
              <div className="flex justify-between items-end px-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total do Pedido</span>
                <span className="text-4xl font-black tracking-tighter text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              <Button 
                className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 rounded-[24px] active:scale-95 transition-all"
                onClick={handleSendOrder}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mr-3" /> Processando...
                  </>
                ) : (
                  <>
                    Enviar p/ Produção <ChevronRight className="ml-3 h-5 w-5" />
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
          <p className="font-black uppercase tracking-widest text-xs">O cardápio está sendo preparado...</p>
        </div>
      )}
    </div>
  );
}
