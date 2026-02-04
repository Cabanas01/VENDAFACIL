'use client';

/**
 * @fileOverview Cardápio Digital Público com Fluxo de 3 Etapas (Step-by-Step).
 * Garantia de zero transações no banco até a confirmação final.
 * 
 * Correção: Modais não se sobrepõem. Um fecha para o outro abrir.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Product, TableInfo, Store, CartItem } from '@/lib/types';
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Search, 
  Loader2,
  X,
  Clock,
  UserCheck,
  CheckCircle2,
  Send,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { addComandaItemByNumero } from '@/lib/add-comanda-item';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export function DigitalMenu({ table, store }: { table: TableInfo; store: Store }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // Controle de Fluxo (1: Lista, 2: Identificar, 3: Confirmar)
  const [orderStep, setOrderStep] = useState<1 | 2 | 3>(1);
  const [showIdModal, setShowIdModal] = useState(false);
  const [customerData, setCustomerData] = useState({ name: '', phone: '', cpf: '' });
  const [hasIdentification, setHasIdentification] = useState(false);

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
  }, [loadProducts]);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category || 'Geral'))), [products]);
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category?.toLowerCase().includes(search.toLowerCase())
  );
  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal_cents, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1, subtotal_cents: (i.qty + 1) * i.unit_price_cents } : i);
      }
      return [...prev, { 
        product_id: product.id, 
        product_name_snapshot: product.name, 
        qty: 1, 
        unit_price_cents: product.price_cents, 
        subtotal_cents: product.price_cents, 
        stock_qty: product.stock_qty
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === productId);
      if (existing && existing.qty > 1) {
        return prev.map(i => i.product_id === productId ? { ...i, qty: i.qty - 1, subtotal_cents: (i.qty - 1) * i.unit_price_cents } : i);
      }
      return prev.filter(i => i.product_id !== productId);
    });
  };

  const handleMainAction = async () => {
    // 1. Apenas abre o resumo visual
    if (orderStep === 1) {
      setIsCartOpen(true);
      setOrderStep(2);
      return;
    }

    // 2. Abre modal de identificação (FECHA O RESUMO PARA NÃO SOBREPOR)
    if (orderStep === 2) {
      if (!hasIdentification) {
        setIsCartOpen(false); // REGRA: Fecha o resumo antes
        setShowIdModal(true);
      } else {
        setOrderStep(3);
      }
      return;
    }

    // 3. Execução REAL do pedido
    if (orderStep === 3) {
      await executeOrderSubmission();
    }
  };

  const handleIdentifyCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerData.name || !customerData.phone) return;
    
    // REGRA: Apenas salva em memória e reabre o resumo no Passo 3
    setHasIdentification(true);
    setShowIdModal(false);
    setOrderStep(3);
    setIsCartOpen(true); // Reabre o resumo para o passo final
    toast({ title: 'Dados salvos!', description: 'Confirme seu pedido agora.' });
  };

  const executeOrderSubmission = async () => {
    if (orderStep !== 3 || isSending) return;

    setIsSending(true);
    try {
      // 1. Resolve/Cria a Comanda no Banco
      const comandaId = await addComandaItemByNumero({
        storeId: store.id,
        numeroComanda: table.number,
        productId: cart[0].product_id,
        productName: cart[0].product_name_snapshot,
        qty: cart[0].qty,
        unitPrice: cart[0].unit_price_cents,
        destino: products.find(p => p.id === cart[0].product_id)?.production_target || 'nenhum'
      });

      if (!comandaId) throw new Error('Não foi possível inicializar seu atendimento.');

      // 2. Registra o Cliente e Vincula
      await supabase.rpc('register_customer_on_table', {
        p_comanda_id: comandaId,
        p_name: customerData.name,
        p_phone: customerData.phone,
        p_cpf: customerData.cpf || null
      });

      // 3. Lança os itens restantes (se houver mais de 1)
      if (cart.length > 1) {
        const remainingItems = cart.slice(1);
        for (const item of remainingItems) {
          const product = products.find(p => p.id === item.product_id);
          await supabase.from('comanda_itens').insert({
            comanda_id: comandaId,
            product_id: item.product_id,
            product_name: item.product_name_snapshot,
            qty: item.qty,
            unit_price: item.unit_price_cents,
            quantidade: item.qty,
            preco_unitario: item.unit_price_cents,
            destino_preparo: product?.production_target || 'nenhum',
            status: 'pendente'
          });
        }
      }

      // 4. Muda status para produção
      await supabase.from('comandas').update({ status: 'em_preparo' }).eq('id', comandaId);

      // Sucesso Total
      setCart([]);
      setIsCartOpen(false);
      setOrderStep(1);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 5000);
      toast({ title: 'Pedido Enviado!' });

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao Enviar', description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">Abrindo Cardápio...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl border border-primary/10">
            <AvatarFallback className="bg-primary text-white font-black text-xs">
              {store.name?.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-tighter leading-none">{store.name}</h1>
            <span className="text-[10px] font-black uppercase text-primary tracking-widest mt-1">Mesa #{table.number}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 bg-green-50">Atendimento Ativo</Badge>
      </header>

      <div className="p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="O que vamos pedir hoje?" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-14 pl-12 rounded-2xl border-none shadow-xl bg-white" 
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
                      <Card key={product.id} className="border-none shadow-sm active:scale-[0.98] overflow-hidden bg-white" onClick={() => addToCart(product)}>
                        <CardContent className="p-4 flex h-28">
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="space-y-1">
                              <h4 className="font-black text-sm uppercase tracking-tight line-clamp-1">{product.name}</h4>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase"><Clock className="h-2.5 w-2.5" /> {product.prep_time_minutes || 15} min</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-primary font-black text-lg tracking-tighter">{formatCurrency(product.price_cents)}</span>
                              {cartItem ? (
                                <div className="flex items-center gap-3 bg-primary text-white rounded-full px-1 py-1 shadow-lg">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-transparent" onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}><Minus className="h-4 w-4" /></Button>
                                  <span className="text-xs font-black w-4 text-center">{cartItem.qty}</span>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-transparent" onClick={(e) => { e.stopPropagation(); addToCart(product); }}><Plus className="h-4 w-4" /></Button>
                                </div>
                              ) : <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border text-slate-400"><Plus className="h-5 w-5" /></div>}
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
          <div className="bg-green-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Pedido Enviado!</p>
              <p className="text-[10px] font-bold opacity-80 uppercase leading-tight">Já estamos preparando para você.</p>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-8 inset-x-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <Button 
            className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl gap-4 flex justify-between px-8 bg-slate-950 text-white hover:bg-slate-900" 
            onClick={handleMainAction}
          >
            <div className="flex items-center gap-3"><ShoppingCart className="h-4 w-4" /> <span>Ver Meu Pedido</span></div>
            <span className="text-base tracking-tighter">{formatCurrency(cartTotal)}</span>
          </Button>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex flex-col justify-end">
          <div className="bg-white rounded-t-[40px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">Resumo do Pedido</h2>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Confirme os itens selecionados</p>
              </div>
              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={() => { setIsCartOpen(false); setOrderStep(1); }}><X className="h-6 w-6" /></Button>
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
                        <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addToCart(products.find(p => p.id === item.product_id)!)}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-8 bg-slate-50 border-t space-y-6">
              <div className="flex justify-between items-end px-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total do Pedido</span>
                <span className="text-4xl font-black tracking-tighter text-slate-950">{formatCurrency(cartTotal)}</span>
              </div>
              <Button 
                className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl rounded-[24px]" 
                onClick={handleMainAction} 
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                ) : orderStep === 2 ? (
                  <><UserCheck className="h-5 w-5 mr-3" /> Identificar-se para Pedir</>
                ) : (
                  <><Send className="h-5 w-5 mr-3" /> Confirmar e Enviar Pedido</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showIdModal} onOpenChange={(open) => !isSending && setShowIdModal(open)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[32px] z-[200]">
          <div className="bg-primary/5 p-10 text-center space-y-4 border-b border-primary/10">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary">
              <UserCheck className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Sua Identificação</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Informe seus dados para prosseguir</p>
            </div>
          </div>
          <div className="p-8">
            <form onSubmit={handleIdentifyCustomer} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu Nome *</label>
                  <Input 
                    placeholder="Como devemos te chamar?" 
                    value={customerData.name} 
                    onChange={e => setCustomerData({...customerData, name: e.target.value})} 
                    className="h-14 font-bold rounded-2xl bg-slate-50 border-none shadow-inner" 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu WhatsApp *</label>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    value={customerData.phone} 
                    onChange={e => setCustomerData({...customerData, phone: e.target.value})} 
                    className="h-14 font-bold rounded-2xl bg-slate-50 border-none shadow-inner" 
                    required 
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20" 
                disabled={isSending}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" /> Salvar e Ver Resumo
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
