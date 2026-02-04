'use client';

/**
 * @fileOverview Cardápio Digital (Autoatendimento) - Fluxo sob demanda.
 * 
 * - Navegação pública livre de produtos.
 * - Identificação e criação de comanda ocorrem apenas no checkout.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  CheckCircle2,
  AlertCircle,
  Send
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export function DigitalMenu({ table, store }: { table: TableInfo; store: Store }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<(CartItem & { notes?: string })[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // Controle de Transação
  const [comandaId, setComandaId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [customerData, setCustomerData] = useState({ name: '', phone: '', cpf: '' });
  const [isIdentifying, setIsIdentifying] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .eq('active', true)
        .order('category', { ascending: true });
      
      setProducts(data || []);
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    loadProducts();
    // Recuperar identificação persistida para esta loja
    const savedId = localStorage.getItem(`vf_cust_${store.id}`);
    if (savedId) setCustomerId(savedId);
  }, [loadProducts, store.id]);

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

  /**
   * Fluxo de Finalização de Pedido
   * 1. Identificar cliente (se necessário)
   * 2. Resolver comanda da mesa
   * 3. Enviar itens
   */
  const handleCheckoutProcess = async (forcedCustomerId?: string) => {
    const finalCustomerId = forcedCustomerId || customerId;

    if (cart.length === 0 || isSending) return;

    // A. Identificação é o primeiro passo
    if (!finalCustomerId) {
      setShowIdModal(true);
      return;
    }

    setIsSending(true);
    try {
      // B. Resolver Comanda (Sincronização Just-in-Time)
      let currentComandaId = comandaId;
      if (!currentComandaId) {
        const { data: comRes, error: comErr } = await supabase.rpc('get_or_create_comanda_by_table', {
          p_table_id: table.id
        });
        
        if (comErr) throw comErr;
        
        const rawCom = Array.isArray(comRes) ? comRes[0] : comRes;
        currentComandaId = typeof rawCom === 'string' ? rawCom : (rawCom?.comanda_id || rawCom?.id);
        
        if (!currentComandaId) throw new Error('Não foi possível abrir o atendimento na mesa.');
        setComandaId(currentComandaId);
      }

      // C. Enviar Itens via RPC
      const payload = cart.map(i => ({
        product_id: i.product_id,
        qty: i.quantity,
        price: i.unit_price_cents,
        notes: i.notes || ''
      }));

      const { error: orderErr } = await supabase.rpc('add_itens_from_table_link', {
        p_comanda_id: currentComandaId,
        p_items: payload
      });

      if (orderErr) throw orderErr;

      // Sucesso
      setCart([]);
      setIsCartOpen(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 5000);
      toast({ title: 'Pedido Enviado!', description: 'Sua solicitação está sendo preparada.' });

    } catch (err: any) {
      console.error('[ORDER_FLOW_ERROR]', err);
      toast({ variant: 'destructive', title: 'Erro ao Enviar', description: err.message || 'Falha ao processar o envio.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleIdentifyCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerData.name || !customerData.phone || isIdentifying) return;

    setIsIdentifying(true);
    try {
      // Garantir que temos uma comanda para vincular o cliente
      let currentComandaId = comandaId;
      if (!currentComandaId) {
        const { data: comRes } = await supabase.rpc('get_or_create_comanda_by_table', { p_table_id: table.id });
        const rawCom = Array.isArray(comRes) ? comRes[0] : comRes;
        currentComandaId = typeof rawCom === 'string' ? rawCom : (rawCom?.comanda_id || rawCom?.id);
        setComandaId(currentComandaId);
      }

      if (!currentComandaId) throw new Error('Falha ao abrir comanda para identificação.');

      const { data: custRes, error: custErr } = await supabase.rpc('register_customer_on_table', {
        p_comanda_id: currentComandaId,
        p_name: customerData.name,
        p_phone: customerData.phone,
        p_cpf: customerData.cpf || null
      });

      if (custErr) throw custErr;

      const rawCust = Array.isArray(custRes) ? custRes[0] : custRes;
      const finalId = typeof rawCust === 'string' ? rawCust : (rawCust?.customer_id || rawCust?.id);
      
      if (!finalId) throw new Error('Falha ao registrar identificação do cliente.');

      setCustomerId(finalId);
      localStorage.setItem(`vf_cust_${store.id}`, finalId);
      setShowIdModal(false);
      
      // Prossegue automaticamente com o envio do pedido usando o novo ID
      toast({ title: 'Identificação concluída!' });
      await handleCheckoutProcess(finalId);

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha na Identificação', description: err.message || 'Erro ao processar seus dados.' });
    } finally {
      setIsIdentifying(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Carregando Itens...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl border border-primary/10 shadow-inner">
            <AvatarFallback className="bg-primary text-white font-black text-xs">{store.name?.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black font-headline uppercase tracking-tighter leading-none">{store.name}</h1>
            <span className="text-[10px] font-black uppercase text-primary tracking-widest mt-1">Mesa #{table.number}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 bg-green-50 border-green-100">Cardápio Digital</Badge>
      </header>

      <div className="p-6 space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="O que você deseja pedir?" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-14 pl-12 rounded-2xl border-none shadow-xl shadow-slate-200/50 text-base"
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
                        className="border-none shadow-sm active:scale-[0.98] overflow-hidden bg-white"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-0 flex h-28">
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div className="space-y-1">
                              <h4 className="font-black text-sm uppercase tracking-tight line-clamp-1">{product.name}</h4>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                                <Clock className="h-2.5 w-2.5" /> {product.prep_time_minutes || 15} min
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-primary font-black text-lg tracking-tighter">{formatCurrency(product.price_cents)}</span>
                              {cartItem ? (
                                <div className="flex items-center gap-3 bg-primary text-white rounded-full px-1 py-1 shadow-lg">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-white" onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}><Minus className="h-4 w-4" /></Button>
                                  <span className="text-xs font-black w-4 text-center">{cartItem.quantity}</span>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-white" onClick={(e) => { e.stopPropagation(); addToCart(product); }}><Plus className="h-4 w-4" /></Button>
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border shadow-sm">
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

      {orderSuccess && (
        <div className="fixed top-24 inset-x-6 z-50 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-green-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-green-500">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Pedido Enviado!</p>
              <p className="text-[10px] font-bold opacity-80 uppercase">Já estamos preparando sua solicitação.</p>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-8 inset-x-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <Button 
            className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl gap-4 flex justify-between px-8"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-4 w-4" />
              <span>Ver meu pedido</span>
            </div>
            <span className="text-base tracking-tighter">{formatCurrency(cartTotal)}</span>
          </Button>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex flex-col justify-end">
          <div className="bg-white rounded-t-[40px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">Meu Pedido</h2>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Resumo dos Itens</p>
              </div>
              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={() => setIsCartOpen(false)}><X className="h-6 w-6" /></Button>
            </div>

            <ScrollArea className="flex-1 px-8 py-6">
              <div className="space-y-8">
                {cart.map(item => (
                  <div key={item.product_id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h5 className="font-black text-sm uppercase tracking-tight">{item.product_name_snapshot}</h5>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatCurrency(item.unit_price_cents)}/un</p>
                      </div>
                      <div className="flex items-center bg-slate-50 rounded-xl h-10 p-1 border">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.product_id)}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addToCart(products.find(p => p.id === item.product_id)!)}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <Input 
                      placeholder="Alguma observação? (Ex: sem gelo)" 
                      value={item.notes}
                      onChange={(e) => setCart(prev => prev.map(i => i.product_id === item.product_id ? { ...i, notes: e.target.value } : i))}
                      className="h-10 text-[11px] font-bold border-dashed bg-slate-50/50"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-8 bg-slate-50 border-t space-y-6">
              <div className="flex justify-between items-end px-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total</span>
                <span className="text-4xl font-black tracking-tighter text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              <Button 
                className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl rounded-[24px]"
                onClick={() => handleCheckoutProcess()}
                disabled={isSending}
              >
                {isSending ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <><Send className="h-5 w-5 mr-3" /> Confirmar e Enviar Pedido</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showIdModal} onOpenChange={(open) => !isIdentifying && !isSending && setShowIdModal(open)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-primary/5 p-10 text-center space-y-4 border-b border-primary/10">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary ring-8 ring-primary/5">
              <UserCheck className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Identificação</h1>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-8">
                Informe seus dados para vincularmos o pedido à sua mesa.
              </p>
            </div>
          </div>
          <div className="p-8">
            <form onSubmit={handleIdentifyCustomer} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</label>
                  <Input placeholder="Como devemos te chamar?" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="h-14 font-bold border-muted-foreground/20 rounded-2xl" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp / Celular</label>
                  <Input placeholder="(00) 00000-0000" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="h-14 font-bold border-muted-foreground/20 rounded-2xl" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF (Opcional)</label>
                  <Input placeholder="000.000.000-00" value={customerData.cpf} onChange={e => setCustomerData({...customerData, cpf: e.target.value})} className="h-14 font-bold border-muted-foreground/20 rounded-2xl" />
                </div>
              </div>
              <Button type="submit" className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20" disabled={isIdentifying || isSending}>
                {isIdentifying ? <Loader2 className="animate-spin h-5 w-5" /> : 'Finalizar Pedido'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
