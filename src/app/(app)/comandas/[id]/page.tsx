'use client';

/**
 * @fileOverview Gestão Detalhada da Comanda - Fluxo de Pedido Confirmado
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Clock,
  ShoppingCart,
  Wallet,
  ClipboardList,
  Search,
  Send,
  ChefHat,
  GlassWater
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ComandaItem, Product, ComandaTotalView } from '@/lib/types';
import { cn } from '@/lib/utils';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

const statusConfig: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
  pendente: { label: 'Aguardando', color: 'bg-slate-500', icon: <Clock className="h-3 w-3 mr-1" /> },
  em_preparo: { label: 'Em Preparo', color: 'bg-orange-500', icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
  pronto: { label: 'Pronto', color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: <Trash2 className="h-3 w-3 mr-1" /> },
};

type TempItem = {
  product: Product;
  quantity: number;
};

export default function ComandaDetailsPage() {
  const { id } = useParams();
  const { store, products } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comanda, setComanda] = useState<ComandaTotalView | null>(null);
  const [items, setItems] = useState<ComandaItem[]>([]);
  const [tempItems, setTempItems] = useState<TempItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !store?.id) return;
    try {
      const [comandaRes, itemsRes] = await Promise.all([
        supabase.from('v_comandas_totais').select('*').eq('comanda_id', id).single(),
        supabase.from('comanda_itens').select('*').eq('comanda_id', id).order('created_at', { ascending: false })
      ]);

      if (comandaRes.error) throw comandaRes.error;
      setComanda(comandaRes.data);
      setItems(itemsRes.data || []);
    } catch (err: any) {
      console.error('[FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [id, store?.id]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`comanda_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens', filter: `comanda_id=eq.${id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, store?.id, fetchData]);

  const filteredProducts = useMemo(() => 
    products.filter(p => p.active && (p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search))),
  [products, search]);

  const addTempItem = (product: Product) => {
    setTempItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({ title: 'Item no rascunho', description: `${product.name} adicionado.` });
  };

  const removeTempItem = (productId: string) => {
    setTempItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const confirmOrder = async () => {
    if (tempItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const itemsToInsert = tempItems.map(item => ({
        comanda_id: id as string,
        product_id: item.product.id,
        product_name: item.product.name,
        quantidade: item.quantity,
        preco_unitario: item.product.price_cents,
        destino_preparo: item.product.destino_preparo || 'nenhum'
      }));

      const { error } = await supabase.from('comanda_itens').insert(itemsToInsert);
      if (error) throw error;

      toast({ title: 'Pedido Enviado!', description: 'Itens enviados para produção.' });
      setTempItems([]);
      setIsAdding(false);
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeItemFromDb = async (itemId: string) => {
    if (!confirm('Deseja cancelar este item já enviado?')) return;
    try {
      const { error } = await supabase.from('comanda_itens').delete().eq('id', itemId);
      if (error) throw error;
      toast({ title: 'Item removido' });
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: err.message });
    }
  };

  const handleCloseComanda = async (method: 'cash' | 'pix' | 'card') => {
    if (tempItems.length > 0) {
      toast({ variant: 'destructive', title: 'Pedido pendente', description: 'Confirme ou remova os itens em rascunho antes de fechar.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('fechar_comanda', {
        p_comanda_id: id as string,
        p_payment_method: method
      });

      if (error) throw error;
      toast({ title: 'Comanda Encerrada!', description: 'Venda registrada com sucesso.' });
      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no fechamento', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Carregando detalhes...</p>
    </div>
  );

  if (!comanda) return <div className="py-20 text-center text-muted-foreground">Comanda não localizada.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/comandas')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black font-headline tracking-tighter uppercase">Comanda #{comanda.numero}</h1>
            <Badge className="bg-green-500 font-black uppercase text-[9px] border-none text-white">Aberta</Badge>
          </div>
          {comanda.mesa && (
            <p className="text-sm text-muted-foreground font-bold uppercase mt-1">Local: {comanda.mesa}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Acumulado</p>
          <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(comanda.total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Rascunho de Novos Itens */}
          {tempItems.length > 0 && (
            <Card className="border-primary border-2 shadow-xl bg-primary/5 animate-in slide-in-from-top-4 duration-300">
              <CardHeader className="bg-primary/10 pb-4 border-b border-primary/10">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                  <ShoppingCart className="h-4 w-4" /> Itens a Enviar para Preparo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {tempItems.map(item => (
                      <TableRow key={item.product.id} className="border-primary/10">
                        <TableCell className="px-6 py-4 font-bold text-sm uppercase">{item.product.name}</TableCell>
                        <TableCell className="text-center font-black">x{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTempItem(item.product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4 bg-primary/10 border-t border-primary/10">
                  <Button className="w-full h-12 font-black uppercase tracking-widest gap-2 shadow-lg" onClick={confirmOrder} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Confirmar e Enviar para Produção
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Itens já lançados e em produção */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> Consumo Lançado
                </CardTitle>
                <Button size="sm" onClick={() => setIsAdding(true)} className="h-8 font-black uppercase text-[10px]">
                  <Plus className="h-3 w-3 mr-1" /> Novo Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase px-6">Produto</TableHead>
                    <TableHead className="font-black text-[10px] uppercase px-6 text-center">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase px-6 text-right">Subtotal</TableHead>
                    <TableHead className="text-right px-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const config = statusConfig[item.status] || statusConfig.pendente;
                    const subtotal = item.quantidade * item.preco_unitario;
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/5 transition-colors border-b border-muted/10">
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-xs uppercase text-foreground">{item.product_name}</span>
                            <span className="text-[10px] text-muted-foreground font-bold">{item.quantidade}un x {formatCurrency(item.preco_unitario)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          <Badge className={cn("text-[8px] font-black uppercase border-none text-white", config.color)}>
                            {config.icon} {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 text-right font-black text-sm text-foreground">
                          {formatCurrency(subtotal)}
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          {item.status === 'pendente' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeItemFromDb(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-muted-foreground text-xs font-black uppercase tracking-widest opacity-30">
                        Nenhum item lançado ainda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/10 shadow-2xl bg-primary/5 sticky top-6">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1 text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Saldo a Pagar</p>
                <p className="text-5xl font-black text-primary tracking-tighter">{formatCurrency(comanda.total)}</p>
              </div>
              <Separator className="bg-primary/10" />
              <Button 
                className="w-full h-14 font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-primary/20"
                onClick={() => setIsClosing(true)}
                disabled={items.length === 0 || tempItems.length > 0 || isSubmitting}
              >
                <Wallet className="h-4 w-4" /> Fechar Conta
              </Button>
              {tempItems.length > 0 && (
                <p className="text-[9px] text-center text-red-500 font-black uppercase animate-pulse">
                  Confirme os novos itens antes de fechar
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <div className="p-6 bg-muted/30 border-b">
            <DialogTitle className="font-black uppercase tracking-widest text-xs">Lançar Itens na Comanda</DialogTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." className="pl-10 h-12 text-sm font-bold" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
          </div>
          <ScrollArea className="h-[50vh] p-4 bg-background">
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(p => (
                <Card key={p.id} className="cursor-pointer hover:border-primary hover:bg-primary/5 transition-all shadow-sm" onClick={() => addTempItem(p)}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-black uppercase text-[10px] truncate text-foreground">{p.name}</p>
                      <p className="text-sm font-black text-primary mt-1">{formatCurrency(p.price_cents)}</p>
                      <div className="flex gap-1 mt-2">
                        {p.destino_preparo === 'cozinha' && <Badge variant="outline" className="text-[7px] font-black uppercase text-orange-600 border-orange-200 px-1">Cozinha</Badge>}
                        {p.destino_preparo === 'bar' && <Badge variant="outline" className="text-[7px] font-black uppercase text-cyan-600 border-cyan-200 px-1">Bar</Badge>}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground opacity-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 bg-muted/30 border-t">
            <Button variant="ghost" onClick={() => setIsAdding(false)} className="font-black uppercase text-[10px]">Fechar Menu</Button>
            {tempItems.length > 0 && (
              <Button onClick={() => { setIsAdding(false); confirmOrder(); }} className="font-black uppercase text-[10px]">
                Enviar {tempItems.length} Itens
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-center font-black uppercase text-lg tracking-tighter">Escolha o Recebimento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <Button variant="outline" className="h-16 justify-start font-black gap-4 border-2 hover:border-primary" onClick={() => handleCloseComanda('cash')}>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Wallet className="h-5 w-5" /></div>
              Dinheiro
            </Button>
            <Button variant="outline" className="h-16 justify-start font-black gap-4 border-2 hover:border-primary" onClick={() => handleCloseComanda('pix')}>
              <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600"><ShoppingCart className="h-5 w-5" /></div>
              PIX
            </Button>
            <Button variant="outline" className="h-16 justify-start font-black gap-4 border-2 hover:border-primary" onClick={() => handleCloseComanda('card')}>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Wallet className="h-5 w-5" /></div>
              Cartão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}