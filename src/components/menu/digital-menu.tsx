'use client';

/**
 * @fileOverview Cardápio Digital (CONTRATO IMUTÁVEL)
 * 
 * Ordem Atômica:
 * 1. Validar Acesso (RPC get_store_access_status)
 * 2. Abrir Comanda (RPC abrir_comanda -> retorna uuid)
 * 3. Registrar Cliente (RPC register_customer_on_table -> 4 params)
 * 4. Inserir Itens via Venda Pendente (sales + sale_items)
 */

import { useState, useEffect, useMemo } from 'react';
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
  Trash2
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
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1, subtotal_cents: (i.qty + 1) * i.unit_price_cents } : i);
      }
      return [...prev, { product_id: product.id, product_name_snapshot: product.name, qty: 1, unit_price_cents: product.price_cents, subtotal_cents: product.price_cents }];
    });
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || cart.length === 0) return;

    setIsSending(true);
    try {
      // 1. Validar Acesso
      const { data: isAllowed } = await supabase.rpc('get_store_access_status', { p_store_id: store.id });
      if (isAllowed === false) throw new Error('Seu acesso está restrito. Chame o garçom.');

      // 2. Abrir Comanda (Retorna UUID)
      const { data: comandaId, error: openError } = await supabase.rpc('abrir_comanda', {
        p_store_id: store.id,
        p_mesa: table.number.toString(),
        p_cliente_nome: customerData.name,
        p_cliente_telefone: customerData.phone,
        p_cliente_cpf: customerData.cpf || null
      });

      if (openError || !comandaId || !isValidUUID(comandaId as string)) {
        console.error('[OPEN_COMANDA_ERROR]', openError);
        throw new Error('Falha ao abrir atendimento no servidor.');
      }

      // 3. Registrar Cliente (4 PARAMS)
      await supabase.rpc('register_customer_on_table', {
        p_comanda_id: comandaId,
        p_cpf: customerData.cpf || null,
        p_name: customerData.name,
        p_phone: customerData.phone
      });

      // 4. Inserir Itens via Sales
      const { data: saleData } = await supabase.from('sales').insert({
        store_id: store.id,
        comanda_id: comandaId,
        total_cents: cartTotal,
        payment_method: 'cash'
      }).select().single();

      if (saleData) {
        const itemsToInsert = cart.map(i => ({
          sale_id: saleData.id,
          product_id: i.product_id,
          product_name_snapshot: i.product_name_snapshot,
          quantity: i.qty,
          unit_price_cents: i.unit_price_cents,
          subtotal_cents: i.subtotal_cents,
          status: 'pendente',
          destino_preparo: products.find(p => p.id === i.product_id)?.production_target || 'nenhum'
        }));
        await supabase.from('sale_items').insert(itemsToInsert);
      }

      setCart([]);
      setShowIdModal(false);
      setOrderSuccess(true);
      toast({ title: 'Pedido Enviado!' });
      setTimeout(() => setOrderSuccess(false), 5000);

    } catch (err: any) {
      console.error('[SUBMIT_ORDER_FATAL]', err);
      toast({ variant: 'destructive', title: 'Erro no Pedido', description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest opacity-50">Carregando Cardápio...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl">
            <AvatarFallback className="bg-primary text-white font-black text-xs">
              {store.name?.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-tighter">{store.name}</h1>
            <span className="text-[10px] font-black uppercase text-primary">Mesa #{table.number}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 bg-green-50">Online</Badge>
      </header>

      <div className="p-6 space-y-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar pratos ou bebidas..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-14 pl-12 rounded-2xl border-none shadow-xl bg-white" 
          />
        </div>

        {categories.map(cat => {
          const catProducts = filteredProducts.filter(p => (p.category || 'Geral') === cat);
          if (catProducts.length === 0) return null;
          return (
            <section key={cat} className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cat}</h3>
              <div className="grid gap-4">
                {catProducts.map(product => (
                  <Card key={product.id} className="border-none shadow-sm active:scale-95 transition-all overflow-hidden bg-white" onClick={() => addToCart(product)}>
                    <CardContent className="p-4 flex gap-4 h-28">
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-black text-sm uppercase tracking-tight line-clamp-1">{product.name}</h4>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase"><Clock className="h-2.5 w-2.5" /> {product.prep_time_minutes || 15} min</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-primary font-black text-lg tracking-tighter">{formatCurrency(product.price_cents)}</span>
                          <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center border text-slate-400">
                            <Plus className="h-4 w-4" />
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
          <Button className="w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl flex justify-between px-8 bg-slate-950" onClick={() => setIsCartOpen(true)}>
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-4 w-4" /> Ver Pedido
            </div>
            <span className="text-base tracking-tighter">{formatCurrency(cartTotal)}</span>
          </Button>
        </div>
      )}

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Meu Pedido</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground">Revise seus itens antes de enviar</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[40vh] py-4">
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.product_id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                  <div>
                    <h5 className="font-black text-xs uppercase tracking-tight">{item.product_name_snapshot}</h5>
                    <p className="text-[10px] font-bold text-primary">{formatCurrency(item.unit_price_cents)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCart(prev => prev.filter(i => i.product_id !== item.product_id))}><Trash2 className="h-3.5 w-3.5 text-slate-400" /></Button>
                    <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col gap-4 pt-4 border-t">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Total</span>
              <span className="text-3xl font-black tracking-tighter text-primary">{formatCurrency(cartTotal)}</span>
            </div>
            <Button className="w-full h-14 font-black uppercase tracking-widest text-xs" onClick={() => { setIsCartOpen(false); setShowIdModal(true); }}>
              Avançar para Identificação <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIdModal} onOpenChange={setShowIdModal}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <UserCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Falta pouco!</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground">Como devemos te chamar?</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitOrder} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</label>
                <Input placeholder="Seu nome" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="h-12 font-bold" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</label>
                <Input placeholder="(00) 00000-0000" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="h-12 font-bold" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-16 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" disabled={isSending}>
              {isSending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Confirmar e Enviar Pedido
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}