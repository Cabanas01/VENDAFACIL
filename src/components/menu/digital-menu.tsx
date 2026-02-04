'use client';

/**
 * @fileOverview Cardápio Digital (Autoatendimento)
 * 
 * Implementa o Fluxo Oficial de 3 Etapas com Tratamento de Erro Robusto:
 * 1. Ver Resumo (Conferência Visual)
 * 2. Identificação (Pop-up Principal - Não fecha em erro)
 * 3. Envio Real (Escrita no Banco com feedback de loading)
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Product, TableInfo, Store, CartItem } from '@/lib/types';
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Search, 
  Loader2,
  Clock,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Trash2,
  AlertCircle,
  Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { addComandaItem } from '@/lib/add-comanda-item';
import { cn } from '@/lib/utils';

export function DigitalMenu({ table, store }: { table: TableInfo; store: Store }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [submissionError, setSubmissionError] = useState<{ message: string; type: 'error' | 'warning' } | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const [customerData, setCustomerData] = useState({ name: '', phone: '', cpf: '' });

  useEffect(() => {
    const loadProducts = async () => {
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
    };
    loadProducts();
  }, [store.id]);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category || 'Geral'))), [products]);
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category?.toLowerCase().includes(search.toLowerCase())
  );
  
  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + item.subtotal_cents, 0), [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id 
          ? { ...i, qty: i.qty + 1, subtotal_cents: (i.qty + 1) * i.unit_price_cents } 
          : i
        );
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
        return prev.map(i => i.product_id === productId 
          ? { ...i, qty: i.qty - 1, subtotal_cents: (i.qty - 1) * i.unit_price_cents } 
          : i
        );
      }
      return prev.filter(i => i.product_id !== productId);
    });
  };

  const handleOpenReview = () => {
    if (cart.length === 0) return;
    setIsCartOpen(true);
  };

  const handleProceedToIdentification = () => {
    setIsCartOpen(false);
    setSubmissionError(null);
    setShowIdModal(true);
  };

  const executeOrderSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || !customerData.name || !customerData.phone) return;

    setIsSending(true);
    setSubmissionError(null);

    try {
      let comandaId: string | null = null;

      // 1. Inserir Itens na Comanda (Resolve ou cria a comanda na primeira iteração)
      for (const item of cart) {
        const product = products.find(p => p.id === item.product_id);
        const cid = await addComandaItem({
          storeId: store.id,
          numeroComanda: table.number,
          productId: item.product_id,
          productName: item.product_name_snapshot,
          qty: item.qty,
          unitPrice: item.unit_price_cents,
          destino: product?.production_target || 'nenhum'
        });
        if (!comandaId) comandaId = cid;
      }

      if (comandaId) {
        // 2. Registrar Cliente e Vincular à Comanda
        const { error: regError } = await supabase.rpc('register_customer_on_table', {
          p_comanda_id: comandaId,
          p_name: customerData.name,
          p_phone: customerData.phone,
          p_cpf: customerData.cpf || null
        });

        if (regError) throw regError;

        // 3. Mover para Preparo
        const { error: updateError } = await supabase.from('comandas')
          .update({ status: 'em_preparo' })
          .eq('id', comandaId)
          .eq('status', 'aberta');
        
        if (updateError) throw updateError;
      }

      // SUCESSO: Limpar tudo e fechar modal
      setCart([]);
      setShowIdModal(false);
      setOrderSuccess(true);
      toast({ title: 'Pedido Enviado!', description: 'Já estamos preparando para você.' });
      setTimeout(() => setOrderSuccess(false), 5000);

    } catch (err: any) {
      console.error('[ORDER_ERROR]', err);
      
      // UX: Converter erro técnico em mensagem amigável e informativa
      // Regra de Ouro: Erro de "já possui pedido" vira AVISO, não BLOQUEIO.
      if (err.message?.includes('violate') || err.message?.includes('check constraint') || err.message?.includes('exists')) {
        setSubmissionError({
          type: 'warning',
          message: "Esta mesa possui um atendimento ativo. Você pode continuar adicionando itens normalmente."
        });
      } else {
        setSubmissionError({
          type: 'error',
          message: "Não foi possível concluir seu pedido agora. Por favor, tente novamente em alguns instantes."
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">Carregando Cardápio...</p>
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
        <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 bg-green-50">Cardápio Ativo</Badge>
      </header>

      <div className="p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="O que você deseja pedir?" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-14 pl-12 rounded-2xl border-none shadow-xl bg-white focus-visible:ring-primary/20" 
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
                      <Card key={product.id} className="border-none shadow-sm active:scale-[0.98] overflow-hidden bg-white group transition-all" onClick={() => addToCart(product)}>
                        <CardContent className="p-4 flex h-28">
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="space-y-1">
                              <h4 className="font-black text-sm uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h4>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase"><Clock className="h-2.5 w-2.5" /> {product.prep_time_minutes || 15} min</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-primary font-black text-lg tracking-tighter">{formatCurrency(product.price_cents)}</span>
                              {cartItem ? (
                                <div className="flex items-center gap-3 bg-slate-950 text-white rounded-full px-1 py-1 shadow-lg" onClick={e => e.stopPropagation()}>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => removeFromCart(product.id)}><Minus className="h-4 w-4" /></Button>
                                  <span className="text-xs font-black w-4 text-center">{cartItem.qty}</span>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => addToCart(product)}><Plus className="h-4 w-4" /></Button>
                                </div>
                              ) : <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"><Plus className="h-5 w-5" /></div>}
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
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Pedido Enviado!</p>
              <p className="text-[9px] font-bold opacity-80 uppercase mt-1">Já estamos preparando tudo.</p>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !isCartOpen && !showIdModal && (
        <div className="fixed bottom-8 inset-x-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <Button 
            className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl flex justify-between px-8 bg-slate-950 hover:bg-slate-900 active:scale-95 transition-all" 
            onClick={handleOpenReview}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-4 w-4" /> 
              <span>Ver Itens</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-primary text-white h-6 font-black">{cart.reduce((a,b) => a + b.qty, 0)}</Badge>
              <span className="text-base tracking-tighter">{formatCurrency(cartTotal)}</span>
            </div>
          </Button>
        </div>
      )}

      {/* MODAL 1: RESUMO DO PEDIDO */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-t-[32px] sm:rounded-b-[32px]">
          <div className="p-8 border-b bg-muted/10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">Meu Pedido</h2>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest mt-1">Resumo visual</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCart([])} className="text-destructive"><Trash2 className="h-5 w-5" /></Button>
            </div>
          </div>
          <ScrollArea className="max-h-[40vh] p-8">
            <div className="space-y-6">
              {cart.map(item => (
                <div key={item.product_id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <h5 className="font-black text-sm uppercase tracking-tight">{item.product_name_snapshot}</h5>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatCurrency(item.unit_price_cents)}/un</p>
                  </div>
                  <div className="flex items-center bg-slate-50 rounded-xl h-10 p-1 border ml-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.product_id)}><Minus className="h-3.5 w-3.5" /></Button>
                    <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addToCart(products.find(p => p.id === item.product_id)!)}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-8 bg-slate-50 border-t space-y-6">
            <div className="flex justify-between items-end px-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total</span>
              <span className="text-4xl font-black tracking-tighter text-slate-950">{formatCurrency(cartTotal)}</span>
            </div>
            <Button 
              className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl rounded-[24px] bg-primary text-white" 
              onClick={handleProceedToIdentification} 
            >
              Identificar-se para Pedir <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: IDENTIFICAÇÃO (MODAL PRINCIPAL) */}
      <Dialog open={showIdModal} onOpenChange={(open) => !isSending && setShowIdModal(open)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl z-[9999] rounded-[32px] fixed">
          <div className="bg-primary/5 p-10 text-center space-y-4 border-b border-primary/10">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary">
              <UserCheck className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Quem está Pedindo?</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preencha para enviarmos à cozinha</p>
            </div>
          </div>
          
          <div className="p-8">
            <form onSubmit={executeOrderSubmission} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo *</label>
                  <Input 
                    placeholder="Seu nome" 
                    value={customerData.name} 
                    onChange={e => setCustomerData({...customerData, name: e.target.value})} 
                    className="h-14 font-bold rounded-2xl bg-slate-50 border-none shadow-inner" 
                    required 
                    disabled={isSending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp / Celular *</label>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    value={customerData.phone} 
                    onChange={e => setCustomerData({...customerData, phone: e.target.value})} 
                    className="h-14 font-bold rounded-2xl bg-slate-50 border-none shadow-inner" 
                    required 
                    disabled={isSending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF (Opcional)</label>
                  <Input 
                    placeholder="000.000.000-00" 
                    value={customerData.cpf} 
                    onChange={e => setCustomerData({...customerData, cpf: e.target.value})} 
                    className="h-14 font-bold rounded-2xl bg-slate-50 border-none shadow-inner" 
                    disabled={isSending}
                  />
                </div>
              </div>

              {submissionError && (
                <div className={cn(
                  "p-4 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in-95 border",
                  submissionError.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-900" : "bg-red-50 border-red-100 text-red-900"
                )}>
                  {submissionError.type === 'warning' ? <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
                  <p className="text-xs font-bold leading-relaxed">{submissionError.message}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className={cn(
                  "w-full h-20 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all",
                  isSending ? "bg-slate-800" : "bg-slate-950 text-white shadow-primary/20"
                )} 
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mr-3" />
                    Enviando Pedido...
                  </>
                ) : (
                  <>Confirmar e Enviar Pedido <CheckCircle2 className="h-5 w-5 ml-2" /></>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-[10px] font-black uppercase tracking-widest opacity-50"
                onClick={() => setShowIdModal(false)}
                disabled={isSending}
              >
                Voltar e Revisar Itens
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
