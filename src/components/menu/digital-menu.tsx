
'use client';

/**
 * @fileOverview Cardápio Digital Público.
 * Sincronizado com as regras de ouro: NUNCA fecha comanda, NUNCA paga.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import type { Product, TableInfo, Store } from '@/lib/types';
import { 
  Plus, 
  ShoppingCart, 
  Search, 
  Loader2,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export function DigitalMenu({ table, store }: { table: TableInfo; store: Store }) {
  const { products, abrirComanda, adicionarItem } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerData] = useState('');
  const [showIdModal, setShowIdModal] = useState(false);

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.product.price_cents * item.qty), 0), [cart]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || cart.length === 0) return;

    setIsSending(true);
    try {
      // 1. Abre comanda (ou recupera aberta para a mesa)
      const comandaId = await abrirComanda(table.number.toString(), customerName);

      // 2. Adiciona itens via RPC
      for (const item of cart) {
        await adicionarItem(comandaId, item.product.id, item.qty);
      }

      setCart([]);
      setShowIdModal(false);
      toast({ title: 'Pedido enviado!', description: 'Já estamos preparando para você.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar pedido', description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <h1 className="text-sm font-black uppercase tracking-tighter">{store.name} — Mesa {table.number}</h1>
        <Badge variant="outline" className="text-[8px] font-black uppercase text-green-600 bg-green-50">Cardápio Ativo</Badge>
      </header>

      <div className="p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar..." 
            className="h-12 pl-12 rounded-2xl border-none shadow-sm bg-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-4">
          {products.filter(p => p.active && p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
            <Card key={p.id} className="border-none shadow-sm active:scale-95 transition-all" onClick={() => {
              const existing = cart.find(i => i.product.id === p.id);
              if (existing) setCart(cart.map(i => i.product.id === p.id ? {...i, qty: i.qty + 1} : i));
              else setCart([...cart, {product: p, qty: 1}]);
            }}>
              <CardContent className="p-4 flex justify-between items-center h-24">
                <div className="space-y-1">
                  <h4 className="font-black text-xs uppercase tracking-tight">{p.name}</h4>
                  <span className="text-primary font-black text-base">{formatCurrency(p.price_cents)}</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-primary"><Plus /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-8 inset-x-6 z-50 animate-in slide-in-from-bottom duration-300">
          <Button className="w-full h-16 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl flex justify-between px-8 bg-slate-950" onClick={() => setIsCartOpen(true)}>
            <span>Ver Pedido ({cart.length})</span>
            <span>{formatCurrency(cartTotal)}</span>
          </Button>
        </div>
      )}

      {/* MODAL REVISÃO */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md rounded-t-[40px] p-0 border-none overflow-hidden">
          <div className="bg-slate-900 text-white p-8">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Meu Carrinho</DialogTitle>
          </div>
          <div className="bg-white p-8 space-y-6">
            <ScrollArea className="max-h-[40vh]">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between items-center mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="font-black text-[10px] uppercase">{item.product.name} (x{item.qty})</div>
                  <Button variant="ghost" size="icon" className="text-red-400" onClick={() => setCart(cart.filter(i => i.product.id !== item.product.id))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </ScrollArea>
            <div className="pt-4 border-t space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-black text-[10px] uppercase text-slate-400">Total</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-[10px]" onClick={() => { setIsCartOpen(false); setShowIdModal(true); }}>
                Confirmar Escolha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL IDENTIFICAÇÃO */}
      <Dialog open={showIdModal} onOpenChange={setShowIdModal}>
        <DialogContent className="sm:max-w-md rounded-[40px] p-0 border-none overflow-hidden">
          <div className="bg-primary/5 p-10 text-center">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Quem está pedindo?</DialogTitle>
          </div>
          <form onSubmit={handleOrder} className="p-10 bg-white space-y-6">
            <Input placeholder="Seu Nome" className="h-14 rounded-xl font-bold bg-slate-50" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
            <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-[10px]" disabled={isSending}>
              {isSending ? <Loader2 className="animate-spin" /> : 'Enviar para Cozinha/Bar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
