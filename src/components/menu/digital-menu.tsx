
'use client';

/**
 * @fileOverview Cardápio Digital (CONTRATO SINCRONIZADO)
 * 
 * Ordem Transacional Atômica:
 * 1. Validar Acesso (RPC get_store_access_status -> retorna BOOLEAN direto)
 * 2. Abrir Comanda (RPC abrir_comanda -> retorna UUID da comanda)
 * 3. Registrar Cliente (RPC register_customer_on_table)
 * 4. Faturar Itens via Venda Pendente (Sales + Sale Items)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Product, TableInfo, Store } from '@/lib/types';
import { 
  Plus, 
  ShoppingCart, 
  Search, 
  Loader2,
  Clock,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Trash2,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { isValidUUID } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function DigitalMenu({ table, store }: { table: TableInfo; store: Store }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const [customerData, setCustomerData] = useState({ name: '', phone: '', cpf: '' });

  useEffect(() => {
    const loadProducts = async () => {
      if (!store?.id) return;
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .eq('active', true)
        .order('name');
      setProducts(data || []);
      setLoading(false);
    };
    loadProducts();
  }, [store?.id]);

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
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1, subtotal_cents: (i.qty + 1) * i.unit_price_cents } : i);
      }
      return [...prev, { product_id: product.id, product_name_snapshot: product.name, qty: 1, unit_price_cents: product.price_cents, subtotal_cents: product.price_cents }];
    });
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || cart.length === 0 || !store?.id) return;

    setIsSending(true);
    try {
      // 1. Validar Acesso (Retorna Boolean Direto)
      const { data: isAllowed, error: accessErr } = await supabase.rpc('get_store_access_status', { p_store_id: store.id });
      
      // O Supabase retorna true/false direto se o RETURNS for boolean
      if (isAllowed === false) {
        throw new Error('Esta unidade está com o sistema de pedidos digital pausado no momento.');
      }

      // 2. Abrir Comanda (Retorna UUID)
      const { data: rawComandaId, error: openError } = await supabase.rpc('abrir_comanda', {
        p_store_id: store.id,
        p_mesa: table.number.toString(),
        p_cliente_nome: customerData.name,
        p_cliente_telefone: customerData.phone || null,
        p_cliente_cpf: customerData.cpf || null
      });

      if (openError) throw openError;

      // Extração robusta do UUID (algumas versões do PostgREST retornam string pura, outras objeto)
      const comandaId = typeof rawComandaId === 'string' ? rawComandaId : (rawComandaId as any)?.id || (rawComandaId as any)?.comanda_id;

      if (!comandaId || !UUID_REGEX.test(comandaId)) {
        console.error('[INVALID_UUID_RETURNED]', rawComandaId);
        throw new Error('Falha de identificação do servidor. Tente novamente.');
      }

      // 3. Registrar Cliente (Para histórico CRM)
      await supabase.rpc('register_customer_on_table', {
        p_comanda_id: comandaId,
        p_cpf: customerData.cpf || null,
        p_name: customerData.name,
        p_phone: customerData.phone || null,
        p_store_id: store.id
      });

      // 4. Inserir Registro Financeiro (Sales)
      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        store_id: store.id,
        comanda_id: comandaId,
        total_cents: cartTotal,
        payment_method: 'cash'
      }).select().single();

      if (saleError) throw saleError;

      // 5. Inserir Itens de Preparo (Sale Items)
      const itemsToInsert = cart.map(i => ({
        sale_id: sale.id,
        product_id: i.product_id,
        product_name_snapshot: i.product_name_snapshot,
        quantity: i.qty,
        unit_price_cents: i.unit_price_cents,
        subtotal_cents: i.subtotal_cents,
        status: 'pendente',
        destino_preparo: products.find(p => p.id === i.product_id)?.production_target || 'nenhum'
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Sucesso Total
      setCart([]);
      setShowIdModal(false);
      setOrderSuccess(true);
      toast({ title: 'Pedido Recebido!', description: 'Já estamos preparando seu pedido.' });
      setTimeout(() => setOrderSuccess(false), 8000);

    } catch (err: any) {
      console.error('[DIGITAL_MENU_ORDER_FATAL]', err);
      toast({ variant: 'destructive', title: 'Falha no Envio', description: err.message || 'Erro de rede. Tente novamente.' });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-[0.2em] opacity-40">Sincronizando Cardápio...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-2xl shadow-sm border">
            <AvatarFallback className="bg-primary text-white font-black text-xs">
              {store.name?.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-tighter">{store.name}</h1>
            <span className="text-[10px] font-black uppercase text-primary">Mesa #{table.number}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 bg-green-50 border-green-100">Atendimento Ativo</Badge>
      </header>

      {orderSuccess && (
        <div className="p-6 animate-in slide-in-from-top duration-500">
          <div className="bg-green-600 text-white p-6 rounded-3xl shadow-xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black uppercase text-sm tracking-tighter">Pedido enviado com sucesso!</p>
              <p className="text-xs opacity-90 font-medium">Aguarde em sua mesa, já estamos preparando.</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="O que você deseja pedir?" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-14 pl-12 rounded-2xl border-none shadow-xl bg-white text-base focus-visible:ring-primary/20" 
          />
        </div>

        {categories.map(cat => {
          const catProducts = filteredProducts.filter(p => (p.category || 'Geral') === cat);
          if (catProducts.length === 0) return null;
          return (
            <section key={cat} className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{cat}</h3>
              <div className="grid gap-4">
                {catProducts.map(product => (
                  <Card key={product.id} className="border-none shadow-sm active:scale-[0.97] transition-all overflow-hidden bg-white" onClick={() => addToCart(product)}>
                    <CardContent className="p-4 flex gap-4 h-28">
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-black text-sm uppercase tracking-tight line-clamp-1">{product.name}</h4>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase"><Clock className="h-2.5 w-2.5" /> {product.prep_time_minutes || 15} min</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-primary font-black text-lg tracking-tighter">{formatCurrency(product.price_cents)}</span>
                          <div className="h-9 w-9 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-active:bg-primary group-active:text-white transition-colors">
                            <Plus className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-8 inset-x-6 z-50 animate-in slide-in-from-bottom-4">
          <Button className="w-full h-16 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl flex justify-between px-8 bg-slate-950 hover:bg-slate-900 border-t border-white/10" onClick={() => setIsCartOpen(true)}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[8px] h-4 w-4 rounded-full flex items-center justify-center border-2 border-slate-950">{cart.length}</span>
              </div>
              Revisar Pedido
            </div>
            <span className="text-base tracking-tighter bg-white/10 px-3 py-1 rounded-lg">{formatCurrency(cartTotal)}</span>
          </Button>
        </div>
      )}

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md rounded-t-[40px] sm:rounded-[40px] border-none p-0 overflow-hidden">
          <div className="bg-slate-950 text-white p-8 pb-12">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-white">Carrinho</DialogTitle>
              <DialogDescription className="text-white/40 font-bold uppercase text-[9px] tracking-widest">Confirme os itens do seu atendimento</DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="-mt-6 bg-white rounded-t-[40px] p-8 space-y-6">
            <ScrollArea className="max-h-[45vh] pr-4">
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product_id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                    <div className="space-y-0.5">
                      <h5 className="font-black text-xs uppercase tracking-tight">{item.product_name_snapshot}</h5>
                      <p className="text-[10px] font-bold text-primary">{formatCurrency(item.unit_price_cents)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-slate-400">x{item.qty}</span>
                      <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-red-50 text-red-400" onClick={() => setCart(prev => prev.filter(i => i.product_id !== item.product_id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="pt-4 border-t space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total do Pedido</span>
                <span className="text-3xl font-black tracking-tighter text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => { setIsCartOpen(false); setShowIdModal(true); }}>
                Enviar para Preparo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showIdModal} onOpenChange={setShowIdModal}>
        <DialogContent className="sm:max-w-md rounded-[40px] p-0 border-none overflow-hidden">
          <div className="bg-primary/5 pt-12 pb-8 px-10 text-center border-b border-primary/10">
            <div className="mx-auto h-16 w-16 rounded-[24px] bg-white flex items-center justify-center text-primary mb-6 shadow-sm border border-primary/10">
              <UserCheck className="h-8 w-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-center">Falta pouco!</DialogTitle>
              <DialogDescription className="text-center font-bold uppercase text-[9px] tracking-[0.2em] text-muted-foreground mt-1">Como devemos te chamar na mesa?</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={submitOrder} className="p-10 bg-white space-y-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu Nome Completo</label>
                <Input placeholder="Ex: João Silva" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="h-14 rounded-xl font-bold bg-slate-50 border-slate-100" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp para Contato</label>
                <Input placeholder="(00) 00000-0000" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="h-14 rounded-xl font-bold bg-slate-50 border-slate-100" required />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1 h-16 font-black uppercase text-[10px] tracking-widest" onClick={() => setShowIdModal(false)}>Voltar</Button>
              <Button type="submit" className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30" disabled={isSending}>
                {isSending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                Confirmar Pedido
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
