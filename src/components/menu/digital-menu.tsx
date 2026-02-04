'use client';

/**
 * @fileOverview Cardápio Digital (CONTRATO IMUTÁVEL)
 * 
 * Fluxo de Pedido Transacional:
 * 1. get_store_access_status (boolean)
 * 2. abrir_comanda (uuid)
 * 3. register_customer_on_table (void)
 * 4. add_items_from_table_link (void)
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
import { cn } from '@/lib/utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export function DigitalMenu({ table, store }: { table: TableInfo; store: Store }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [submissionError, setSubmissionError] = useState<{ message: string; type: 'error' | 'warning' } | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const [customerData, setCustomerData] = useState({ name: '', phone: '', cpf: '' });

  useEffect(() => {
    const loadProducts = async () => {
      if (!store?.id || !UUID_REGEX.test(store.id)) return;
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
        subtotal_cents: product.price_cents
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

  const executeOrderSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || cart.length === 0 || !store?.id) return;

    setIsSending(true);
    setSubmissionError(null);

    try {
      // 1. Validar Acesso (Boolean)
      const { data: isAllowed, error: accessError } = await supabase.rpc('get_store_access_status', { 
        p_store_id: store.id 
      });
      
      if (accessError || isAllowed !== true) {
        throw new Error('LOJA_BLOQUEADA');
      }

      // 2. Abrir Comanda (Retorna UUID)
      const { data: comandaUuid, error: openError } = await supabase.rpc('abrir_comanda', {
        p_store_id: store.id,
        p_mesa: table.number.toString(),
        p_cliente_nome: customerData.name,
        p_cliente_telefone: customerData.phone,
        p_cliente_cpf: customerData.cpf || null
      });

      if (openError || !comandaUuid || !UUID_REGEX.test(comandaUuid)) {
        throw new Error('FALHA_COMAND_ID');
      }

      // 3. Registrar Cliente (Obrigatório p_store_id conforme assinatura)
      const { error: customerError } = await supabase.rpc('register_customer_on_table', {
        p_comanda_id: comandaUuid,
        p_name: customerData.name,
        p_phone: customerData.phone,
        p_cpf: customerData.cpf || null,
        p_store_id: store.id
      });

      if (customerError) console.warn('[NON_FATAL] Falha ao registrar cliente nos registros globais.');

      // 4. Adicionar Itens
      const itemsPayload = cart.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name_snapshot,
        qty: i.qty,
        unit_price: i.unit_price_cents
      }));

      const { error: itemsError } = await supabase.rpc('add_items_from_table_link', {
        p_comanda_id: comandaUuid,
        p_items: itemsPayload
      });

      if (itemsError) throw itemsError;

      // Sucesso
      setCart([]);
      setShowIdModal(false);
      setOrderSuccess(true);
      toast({ title: 'Pedido Enviado!', description: 'Seu pedido já está em preparo.' });
      setTimeout(() => setOrderSuccess(false), 5000);

    } catch (err: any) {
      console.error('[ORDER_SUBMISSION_ERROR]', err);
      let msg = "Falha ao processar pedido. Tente novamente.";
      if (err.message === 'LOJA_BLOQUEADA') msg = "Esta unidade não está aceitando pedidos digitais no momento.";
      if (err.message === 'FALHA_COMAND_ID') msg = "Erro ao gerar identificador de mesa. Chame o garçom.";
      
      setSubmissionError({ type: 'error', message: msg });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl border border-primary/10">
            <AvatarFallback className="bg-primary text-white font-black text-xs">
              {store.name?.substring(0,2).toUpperCase() || 'VF'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-tighter leading-none">{store.name}</h1>
            <span className="text-[10px] font-black uppercase text-primary tracking-widest mt-1">Mesa #{table.number}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 bg-green-50">Menu Ativo</Badge>
      </header>

      <div className="p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="O que deseja pedir hoje?" 
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
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Pedido Enviado!</p>
              <p className="text-[9px] font-bold opacity-80 uppercase mt-1">Preparando seus itens.</p>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !isCartOpen && !showIdModal && (
        <div className="fixed bottom-8 inset-x-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <Button 
            className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl flex justify-between px-8 bg-slate-950 hover:bg-slate-900 active:scale-95 transition-all" 
            onClick={() => setIsCartOpen(true)}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-4 w-4" /> 
              <span>Ver Pedido</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-primary text-white h-6 font-black">{cart.reduce((a,b) => a + b.qty, 0)}</Badge>
              <span className="text-base tracking-tighter">{formatCurrency(cartTotal)}</span>
            </div>
          </Button>
        </div>
      )}

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-t-[32px] sm:rounded-b-[32px]">
          <DialogHeader className="p-8 border-b bg-muted/10 text-left">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter text-slate-950">Meus Escolhidos</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase text-primary tracking-widest mt-1">Revise seu pedido antes de enviar</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCart([])} className="text-destructive"><Trash2 className="h-5 w-5" /></Button>
            </div>
          </DialogHeader>
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
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Subtotal</span>
              <span className="text-4xl font-black tracking-tighter text-slate-950">{formatCurrency(cartTotal)}</span>
            </div>
            <Button 
              className="w-full h-20 text-sm font-black uppercase tracking-[0.2em] shadow-2xl rounded-[24px] bg-primary text-white" 
              onClick={() => { setIsCartOpen(false); setShowIdModal(true); }} 
            >
              Identificar e Pedir <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showIdModal} onOpenChange={(open) => !isSending && setShowIdModal(open)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl z-[9999] rounded-[32px]">
          <DialogHeader className="bg-primary/5 p-10 text-center space-y-4 border-b border-primary/10">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary">
              <UserCheck className="h-8 w-8" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter text-center">Falta pouco!</DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center mt-1">Identifique-se para confirmarmos seu pedido</DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="p-8">
            <form onSubmit={executeOrderSubmission} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo *</label>
                  <Input 
                    placeholder="Como devemos te chamar?" 
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
              </div>

              {submissionError && (
                <div className={cn(
                  "p-4 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in-95 border",
                  submissionError.type === 'error' ? "bg-red-50 border-red-100 text-red-900" : "bg-yellow-50 border-yellow-100 text-yellow-900"
                )}>
                  {submissionError.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" /> : <Info className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />}
                  <p className="text-xs font-bold leading-relaxed">{submissionError.message}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className={cn(
                  "w-full h-20 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all",
                  isSending ? "bg-slate-800" : "bg-slate-950 text-white shadow-primary/20"
                )} 
                disabled={isSending || !customerData.name || !customerData.phone}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mr-3" />
                    Enviando...
                  </>
                ) : (
                  <>Confirmar e Enviar Pedido <CheckCircle2 className="h-5 w-5 ml-2" /></>
                )}
              </Button>
              
              {!isSending && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-[10px] font-black uppercase tracking-widest opacity-50"
                  onClick={() => setShowIdModal(false)}
                >
                  Voltar ao Cardápio
                </Button>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
