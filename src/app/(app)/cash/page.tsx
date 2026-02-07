
'use client';

/**
 * @fileOverview Gestão de Caixa v6.0.
 * Adicionado campo obrigatório de Fundo Inicial e sincronização global de estado.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Coins, 
  CreditCard, 
  PiggyBank, 
  Briefcase, 
  History, 
  CheckCircle, 
  PlusCircle, 
  Wallet, 
  Loader2,
  CircleDollarSign
} from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';

import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function CashPage() {
  const { cashSessions, sales, refreshStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [isOpening, setIsOpening] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState('');
  
  const cashSessionsSafe = useMemo(() => Array.isArray(cashSessions) ? cashSessions : [], [cashSessions]);
  const salesSafe = useMemo(() => Array.isArray(sales) ? sales : [], [sales]);

  const openSession = useMemo(() => cashSessionsSafe.find(s => s.status === 'open'), [cashSessionsSafe]);
  const hasOpenCash = !!openSession;

  const handleOpenCash = async () => {
    const amountCents = Math.round(parseFloat(initialAmount.replace(',', '.')) * 100);
    
    if (isNaN(amountCents) || amountCents < 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Informe o fundo inicial corretamente.' });
      return;
    }

    setIsOpening(true);
    try {
      const { error } = await supabase.rpc('open_cash_session', {
        p_initial_amount: amountCents
      });
      
      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Turno de caixa aberto com sucesso.' });
      setInitialAmount('');
      setIsModalOpen(false);
      
      // 🔥 Forçar sincronização global para que o Dashboard saiba que o caixa abriu
      await refreshStatus();
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao abrir caixa', description: err.message });
    } finally {
      setIsOpening(false);
    }
  };

  const calculateSalesForPeriod = (fromStr: string, toStr: string | null) => {
    const fromDate = parseISO(fromStr);
    const toDate = toStr ? parseISO(toStr) : new Date();

    return salesSafe.filter(sale => {
      if (!sale?.created_at) return false;
      const saleDate = parseISO(sale.created_at);
      return saleDate >= fromDate && saleDate <= toDate;
    }).reduce((acc, sale) => {
      acc.totalCents += (sale.total_cents || 0);
      acc.count += 1;
      const method = (sale.payment_method || '').toLowerCase();
      if (method === 'cash' || method === 'dinheiro') acc.cash += (sale.total_cents || 0);
      if (method === 'pix') acc.pix += (sale.total_cents || 0);
      if (['card', 'cartao'].includes(method)) acc.card += (sale.total_cents || 0);
      return acc;
    }, { totalCents: 0, count: 0, cash: 0, pix: 0, card: 0 });
  };

  const salesInOpenSession = useMemo(() => 
    openSession ? calculateSalesForPeriod(openSession.opened_at, null) : null
  , [openSession, salesSafe]);

  const reportData = useMemo(() => {
    if (!dateRange?.from) return null;
    const from = startOfDay(dateRange.from).toISOString();
    const to = endOfDay(dateRange.to || dateRange.from).toISOString();
    return calculateSalesForPeriod(from, to);
  }, [dateRange, salesSafe]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Fluxo de Caixa" subtitle="Gestão financeira e controle de turno." />
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            {!hasOpenCash ? (
              <Card className="border-dashed border-2 bg-muted/5 py-12">
                <CardContent className="flex flex-col items-center text-center space-y-6">
                  <div className="p-5 bg-background rounded-full border shadow-sm ring-8 ring-primary/5">
                    <Wallet className="h-10 w-10 text-primary/40" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tight">Caixa Fechado</h3>
                    <p className="text-sm text-muted-foreground max-w-xs font-medium">Inicie um novo turno para registrar vendas e controlar o saldo da gaveta.</p>
                  </div>
                  <Button size="lg" className="font-black uppercase text-[11px] tracking-widest h-14 px-10" onClick={() => setIsModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Abrir Caixa Agora
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-500/20 bg-green-50/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="text-green-500" />
                          Operação em Andamento
                      </CardTitle>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 uppercase font-black text-[9px]">Ativo</Badge>
                    </div>
                    <CardDescription className="font-bold">
                         Turno aberto em {format(parseISO(openSession!.opened_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="p-4 bg-background border rounded-xl shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Fundo Inicial</p>
                            <p className="text-xl font-black">{formatCurrency(openSession!.opening_amount_cents)}</p>
                        </div>
                        <div className="p-4 bg-background border rounded-xl shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendas (Cash)</p>
                            <p className="text-xl font-black text-primary">{formatCurrency(salesInOpenSession?.cash || 0)}</p>
                        </div>
                        <div className="p-4 bg-primary text-primary-foreground rounded-xl shadow-lg">
                            <p className="text-[10px] uppercase font-bold opacity-80">Saldo na Gaveta</p>
                            <p className="text-xl font-black">{formatCurrency(openSession!.opening_amount_cents + (salesInOpenSession?.cash || 0))}</p>
                        </div>
                    </div>
                </CardContent>
              </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" /> Relatórios Consolidados</CardTitle>
                      <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
                    </div>
                </CardHeader>
                <CardContent>
                    {reportData ? (
                       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                           <div className="p-4 border rounded-lg bg-muted/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Faturamento</p>
                                <p className="text-lg font-black">{formatCurrency(reportData.totalCents)}</p>
                           </div>
                           <div className="p-4 border rounded-lg bg-muted/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Entradas Dinheiro</p>
                                <p className="text-lg font-black">{formatCurrency(reportData.cash)}</p>
                           </div>
                           <div className="p-4 border rounded-lg bg-muted/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">PIX/Cartão</p>
                                <p className="text-lg font-black">{formatCurrency(reportData.pix + reportData.card)}</p>
                           </div>
                           <div className="p-4 border rounded-lg bg-muted/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendas</p>
                                <p className="text-lg font-black">{reportData.count}</p>
                           </div>
                       </div>
                    ) : (
                      <p className="text-center py-6 text-muted-foreground text-sm font-medium">Selecione uma data para visualizar os dados.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        
        <div className="space-y-6">
            <Card className="shadow-sm border-primary/10">
                 <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Ações</CardTitle></CardHeader>
                 <CardContent className="flex flex-col gap-3">
                     <Button variant="outline" className="w-full h-12 font-bold" onClick={() => router.push('/sales/new')}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Ir para PDV
                     </Button>
                 </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-3">
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest"><History className="h-4 w-4" /> Histórico de Sessões</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                      <TableHeader className="bg-muted/10">
                          <TableRow>
                              <TableHead className="px-6">Abertura / Fechamento</TableHead>
                              <TableHead className="text-right">Fundo</TableHead>
                              <TableHead className="text-right">Vendas (Cash)</TableHead>
                              <TableHead className="text-right">Total Final</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {cashSessionsSafe.map(cr => {
                              const sessionSales = calculateSalesForPeriod(cr.opened_at, cr.closed_at);
                              const totalExpected = (cr.opening_amount_cents || 0) + sessionSales.cash;
                              return (
                              <TableRow key={cr.id} className="hover:bg-muted/5 transition-colors">
                                  <TableCell className="px-6">
                                      <div className="flex flex-col text-[10px]">
                                        <span className="font-black uppercase">{format(parseISO(cr.opened_at), 'dd/MM/yy HH:mm')}</span>
                                        <span className="text-muted-foreground font-medium">{cr.closed_at ? format(parseISO(cr.closed_at), 'dd/MM/yy HH:mm') : 'Em aberto'}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-bold">{formatCurrency(cr.opening_amount_cents)}</TableCell>
                                  <TableCell className="text-right text-xs text-green-600 font-black">+{formatCurrency(sessionSales.cash)}</TableCell>
                                  <TableCell className="text-right font-black text-sm">
                                    {formatCurrency(cr.closed_at ? (cr.closing_amount_cents || totalExpected) : totalExpected)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <Badge variant={cr.status === 'closed' ? 'secondary' : 'default'} className={cr.status === 'open' ? 'bg-green-500 animate-pulse' : ''}>
                                          {cr.status === 'closed' ? 'FECHADO' : 'ABERTO'}
                                      </Badge>
                                  </TableCell>
                              </TableRow>
                          )})}
                      </TableBody>
                  </Table>
                </div>
            </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-primary/5 pt-10 pb-6 px-8 text-center border-b">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-primary/10 mb-4">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Abertura de Caixa</DialogTitle>
              <DialogDescription className="text-sm font-medium">Informe o valor em dinheiro disponível para troco.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 p-8 bg-background">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fundo Inicial (R$)</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                className="h-14 font-black text-2xl border-primary/10 shadow-inner"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                autoFocus
              />
            </div>

            <DialogFooter className="pt-4">
              <Button 
                className="w-full h-14 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20"
                onClick={handleOpenCash}
                disabled={isOpening || !initialAmount}
              >
                {isOpening ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CircleDollarSign className="h-4 w-4 mr-2" />}
                Confirmar Abertura
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
