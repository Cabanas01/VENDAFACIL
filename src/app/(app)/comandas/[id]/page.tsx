'use client';

/**
 * @fileOverview Gestão Detalhada da Comanda - Alinhado com RLS e Schema Supabase
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
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ComandaItem, Product, ComandaTotalView } from '@/lib/types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

const statusConfig: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
  pendente: { label: 'Aguardando', color: 'bg-slate-500', icon: <Clock className="h-3 w-3 mr-1" /> },
  em_preparo: { label: 'Em Preparo', color: 'bg-orange-500', icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
  pronto: { label: 'Pronto', color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: <Trash2 className="h-3 w-3 mr-1" /> },
};

export default function ComandaDetailsPage() {
  const { id } = useParams();
  const { store, products } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comanda, setComanda] = useState<ComandaTotalView | null>(null);
  const [items, setItems] = useState<ComandaItem[]>([]);
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

  const addItem = async (product: Product) => {
    setIsSubmitting(true);
    try {
      // IMPORTANTE: Respeitar schema e Check Constraint do banco
      // Não enviamos 'status', o banco assume 'pendente' por default.
      const { error } = await supabase.from('comanda_itens').insert({
        comanda_id: id as string,
        product_id: product.id,
        product_name: product.name,
        quantidade: 1,
        preco_unitario: product.price_cents,
        destino_preparo: product.destino_preparo
      });

      if (error) throw error;
      toast({ title: 'Adicionado!', description: `${product.name} incluído na comanda.` });
      fetchData(); // Sincroniza view de total
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!confirm('Deseja realmente remover este item?')) return;
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
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Atual</p>
          <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(comanda.total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> Lista de Consumo
                </CardTitle>
                <Button size="sm" onClick={() => setIsAdding(true)} className="h-8 font-black uppercase text-[10px]">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Item
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeItem(item.id)}>
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
                        Nenhum item lançado
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
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Saldo da Comanda</p>
                <p className="text-5xl font-black text-primary tracking-tighter">{formatCurrency(comanda.total)}</p>
              </div>
              <Separator className="bg-primary/10" />
              <Button 
                className="w-full h-14 font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-primary/20"
                onClick={() => setIsClosing(true)}
                disabled={items.length === 0 || isSubmitting}
              >
                <Wallet className="h-4 w-4" /> Fechar Turno e Receber
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <div className="p-6 bg-muted/30 border-b">
            <DialogTitle className="font-black uppercase tracking-widest text-xs">Menu de Lançamentos</DialogTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." className="pl-10 h-12 text-sm font-bold" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
          </div>
          <ScrollArea className="h-[50vh] p-4 bg-background">
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(p => (
                <Card key={p.id} className="cursor-pointer hover:border-primary hover:bg-primary/5 transition-all shadow-sm" onClick={() => addItem(p)}>
                  <CardContent className="p-4">
                    <p className="font-black uppercase text-[10px] truncate text-foreground">{p.name}</p>
                    <p className="text-sm font-black text-primary mt-1">{formatCurrency(p.price_cents)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-center font-black uppercase text-lg tracking-tighter">Forma de Recebimento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <Button variant="outline" className="h-16 justify-start font-black gap-4 border-2 hover:border-primary" onClick={() => handleCloseComanda('cash')}>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Wallet className="h-5 w-5" /></div>
              Dinheiro (Espécie)
            </Button>
            <Button variant="outline" className="h-16 justify-start font-black gap-4 border-2 hover:border-primary" onClick={() => handleCloseComanda('pix')}>
              <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600"><ShoppingCart className="h-5 w-5" /></div>
              PIX QR Code
            </Button>
            <Button variant="outline" className="h-16 justify-start font-black gap-4 border-2 hover:border-primary" onClick={() => handleCloseComanda('card')}>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><CreditCard className="h-5 w-5" /></div>
              Cartão Débito/Crédito
            </Button>
          </div>
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Processando venda...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { CreditCard } from 'lucide-react';
