'use client';

/**
 * @fileOverview Detalhes da Comanda (Visão de Atendimento)
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  User,
  MapPin,
  CreditCard,
  Send,
  XCircle,
  Clock,
  Search,
  Coins
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ComandaItem, Product, ComandaTotalView, Customer } from '@/lib/types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandaDetailsPage() {
  const { id } = useParams();
  const { products, refreshStatus, store } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comanda, setComanda] = useState<ComandaTotalView | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<ComandaItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pedido temporário (Rascunho)
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [tempItems, setTempItems] = useState<{ product: Product; quantity: number }[]>([]);
  
  // Fechamento
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !store?.id) return;
    try {
      const [comandaRes, itemsRes] = await Promise.all([
        supabase.from('v_comandas_totais').select('*').eq('comanda_id', id).maybeSingle(),
        supabase.from('comanda_itens').select('*').eq('comanda_id', id).order('created_at', { ascending: false })
      ]);

      if (!comandaRes.data || comandaRes.data.status !== 'aberta') {
        router.replace('/comandas');
        return;
      }

      setComanda(comandaRes.data);
      setItems(itemsRes.data || []);

      // Busca dados do cliente via customer_id
      const { data: baseComanda } = await supabase.from('comandas').select('customer_id').eq('id', id).single();
      if (baseComanda?.customer_id) {
        const { data: custData } = await supabase.from('customers').select('*').eq('id', baseComanda.customer_id).single();
        setCustomer(custData);
      }
    } catch (err) {
      console.error('[FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [id, store?.id, router]);

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel(`sync_comanda_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens', filter: `comanda_id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comandas', filter: `id=eq.${id}` }, (payload: any) => {
        if (payload.new.status === 'fechada') router.push('/comandas');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchData, router]);

  const addTempItem = (product: Product) => {
    setTempItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const confirmOrder = async () => {
    if (tempItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const inserts = tempItems.map(i => ({
        comanda_id: id as string,
        product_id: i.product.id,
        product_name: i.product.name,
        quantidade: i.quantity,
        preco_unitario: i.product.price_cents,
        destino_preparo: i.product.production_target || 'nenhum'
      }));

      const { error } = await supabase.from('comanda_itens').insert(inserts);
      if (error) throw error;

      toast({ title: 'Pedido Enviado!', description: 'Itens foram enviados para os painéis de preparo.' });
      setTempItems([]);
      setIsAdding(false);
      await fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseComanda = async (method: 'cash' | 'pix' | 'card') => {
    if (!comanda?.total || comanda.total <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('fechar_comanda', {
        p_comanda_id: id as string,
        p_payment_method: method
      });

      if (error) throw error;
      
      const res = typeof data === 'string' ? JSON.parse(data) : data;
      if (!res.success) throw new Error(res.message);

      await refreshStatus(); 
      toast({ title: 'Comanda Encerrada!', description: 'A venda foi registrada e o caixa atualizado.' });
      router.push('/comandas');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao fechar', description: err.message });
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-[60vh] flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizando Comanda...</p></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/comandas')} className="h-10 w-10 p-0 rounded-full hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter uppercase leading-none">Comanda #{comanda?.numero}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black text-[10px] uppercase">
                Status: Ativo
              </Badge>
              <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {comanda?.mesa || 'Balcão'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-background p-5 rounded-2xl border border-primary/10 shadow-sm flex flex-col items-end ring-4 ring-primary/5">
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1 opacity-60">Consumo Acumulado</p>
          <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(comanda?.total || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-muted/20 overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Titular</p>
                  <p className="font-black text-sm uppercase tracking-tight">{customer?.name || comanda?.cliente_nome || 'Consumidor Final'}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[10px] font-bold text-muted-foreground">{customer?.phone || '—'}</p>
                <p className="text-[9px] text-muted-foreground font-mono bg-background px-1.5 rounded mt-1">{customer?.cpf || '—'}</p>
              </div>
            </CardContent>
          </Card>

          {tempItems.length > 0 && (
            <Card className="border-primary bg-primary/5 shadow-2xl animate-in slide-in-from-top-2 duration-500 ring-2 ring-primary/20">
              <CardHeader className="py-3 border-b border-primary/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Plus className="h-3 w-3" /> Rascunho de Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  {tempItems.map(i => (
                    <div key={i.product.id} className="flex justify-between items-center font-bold text-sm bg-background p-2 rounded-lg border border-primary/10">
                      <span className="uppercase text-xs tracking-tight">
                        <Badge variant="secondary" className="mr-2 px-1">x{i.quantity}</Badge>
                        {i.product.name}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/5" onClick={() => setTempItems(prev => prev.filter(x => x.product.id !== i.product.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button className="w-full h-14 font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]" onClick={confirmOrder} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Send className="mr-2 h-4 w-4" />}
                  Confirmar e Enviar para Produção
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center bg-muted/10 border-b py-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> Histórico de Lançamentos
              </CardTitle>
              <Button size="sm" onClick={() => setIsAdding(true)} className="h-9 px-4 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/10">
                <Plus className="h-3 w-3 mr-1.5" /> Adicionar Itens
              </Button>
            </CardHeader>
            <div className="overflow-hidden">
              <Table>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/5 transition-colors border-b border-muted/10 group">
                      <TableCell className="font-bold py-4 px-6">
                        <div className="flex flex-col">
                          <span className="uppercase text-xs tracking-tight">{item.product_name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/10 bg-primary/5 text-primary/70">
                              Setor: {item.destino_preparo || 'balcão'}
                            </Badge>
                            <span className="text-[9px] font-bold text-muted-foreground/50 lowercase italic">
                              {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs px-6">
                        <div className="bg-muted h-7 w-7 rounded-md flex items-center justify-center mx-auto text-[10px]">
                          x{item.quantidade}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-primary px-6">
                        {formatCurrency(item.quantidade * item.preco_unitario)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                          <Plus className="h-8 w-8" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item lançado ainda</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-2xl overflow-hidden sticky top-24 ring-1 ring-primary/10">
            <CardHeader className="bg-primary/10 text-center py-6 border-b border-primary/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Conclusão de Turno</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-1 py-6 bg-background rounded-2xl border border-primary/5 shadow-inner">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Valor Total</p>
                <p className="text-5xl font-black text-foreground tracking-tighter">{formatCurrency(comanda?.total || 0)}</p>
              </div>
              
              <Button 
                className="w-full h-20 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all hover:scale-[1.03] active:scale-95 group" 
                onClick={() => setIsClosing(true)}
                disabled={!comanda?.total || comanda.total <= 0 || tempItems.length > 0}
              >
                <CheckCircle2 className="h-7 w-7 mr-3 group-hover:animate-bounce" /> Encerrar Conta
              </Button>
              <p className="text-[10px] text-center text-muted-foreground font-medium italic">
                * Certifique-se de que todos os pedidos foram confirmados antes de fechar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Lançamento de Produtos</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">Selecione os itens para adicionar ao rascunho</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar por nome ou categoria..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="h-14 pl-11 text-lg font-bold border-muted-foreground/20 focus-visible:ring-primary/20"
                autoFocus
              />
            </div>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {products
                  .filter(p => p.active && p.name.toLowerCase().includes(search.toLowerCase()))
                  .map(p => (
                    <Button 
                      key={p.id} 
                      variant="outline" 
                      className="h-24 flex flex-col items-start gap-1 justify-center px-5 border-muted-foreground/10 hover:border-primary hover:bg-primary/5 hover:scale-[1.02] transition-all"
                      onClick={() => addTempItem(p)}
                    >
                      <span className="font-black text-[11px] uppercase leading-tight text-left break-words w-full">{p.name}</span>
                      <div className="flex items-center justify-between w-full mt-1 border-t border-muted pt-1.5">
                        <span className="text-[10px] font-black text-primary">{formatCurrency(p.price_cents)}</span>
                        <Badge variant="outline" className="text-[8px] h-4 px-1 lowercase font-bold">{p.production_target || 'balcão'}</Badge>
                      </div>
                    </Button>
                  ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t">
            <Button className="w-full h-12 font-black uppercase text-xs tracking-widest" onClick={() => setIsAdding(false)}>Voltar para Comanda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-background pt-10 pb-6 px-8 text-center border-b">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center font-black uppercase tracking-tighter text-3xl">Pagamento</DialogTitle>
              <DialogDescription className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Escolha o método para finalizar a venda</DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex flex-col gap-3 p-8 bg-slate-50">
            <Button variant="outline" className="h-20 justify-start text-sm font-black uppercase tracking-widest gap-5 border-2 bg-background hover:border-green-500 hover:bg-green-50 transition-all group" onClick={() => handleCloseComanda('cash')}>
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform"><Coins className="h-7 w-7 text-green-600" /></div>
              <div className="flex flex-col items-start">
                <span>Dinheiro</span>
                <span className="text-[9px] font-bold text-muted-foreground">Registro imediato no caixa</span>
              </div>
            </Button>
            <Button variant="outline" className="h-20 justify-start text-sm font-black uppercase tracking-widest gap-5 border-2 bg-background hover:border-cyan-500 hover:bg-cyan-50 transition-all group" onClick={() => handleCloseComanda('pix')}>
              <div className="h-12 w-12 rounded-xl bg-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="h-7 w-7 text-cyan-600" /></div>
              <div className="flex flex-col items-start">
                <span>PIX QR Code</span>
                <span className="text-[9px] font-bold text-muted-foreground">Transferência instantânea</span>
              </div>
            </Button>
            <Button variant="outline" className="h-20 justify-start text-sm font-black uppercase tracking-widest gap-5 border-2 bg-background hover:border-blue-500 hover:bg-blue-50 transition-all group" onClick={() => handleCloseComanda('card')}>
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform"><CreditCard className="h-7 w-7 text-blue-600" /></div>
              <div className="flex flex-col items-start">
                <span>Cartão Débito/Crédito</span>
                <span className="text-[9px] font-bold text-muted-foreground">Conciliação bancária</span>
              </div>
            </Button>
          </div>
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Sincronizando com Banco Central...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
