'use client';

/**
 * @fileOverview Gestão de Caixa Blindada.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Coins, CreditCard, PiggyBank, Briefcase, History, CheckCircle, XCircle, PlusCircle, ArrowUpRight, Wallet, AlertTriangle, Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';

import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function CashPage() {
  const { cashSessions, sales, refreshStatus } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [isOpening, setIsOpening] = useState(false);
  const router = useRouter();
  
  const cashSessionsSafe = cashSessions ?? [];
  const salesSafe = sales ?? [];

  const openSession = useMemo(() => cashSessionsSafe.find(s => s.status === 'open'), [cashSessionsSafe]);
  const hasOpenCash = !!openSession;

  const handleOpenCash = async () => {
    setIsOpening(true);
    try {
      const { error } = await supabase.rpc('open_cash_session');
      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Turno de caixa aberto com sucesso.' });
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

    const totals = salesSafe.filter(sale => {
      if (!sale?.created_at) return false;
      const saleDate = parseISO(sale.created_at);
      return saleDate.getTime() >= fromDate.getTime() && saleDate.getTime() <= toDate.getTime();
    }).reduce((acc, sale) => {
      acc.totalCents += (sale.total_cents || 0);
      acc.count += 1;
      if (sale.payment_method === 'cash') acc.cash += (sale.total_cents || 0);
      if (sale.payment_method === 'pix') acc.pix += (sale.total_cents || 0);
      if (sale.payment_method === 'card') acc.card += (sale.total_cents || 0);
      return acc;
    }, { totalCents: 0, count: 0, cash: 0, pix: 0, card: 0 });

    return totals;
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
    <div className="space-y-8">
      <PageHeader title="Fluxo de Caixa" subtitle="Gestão financeira e fechamento de turno." />
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            {!hasOpenCash ? (
              <Card className="border-dashed border-2 bg-muted/5">
                <CardContent className="py-12 flex flex-col items-center text-center space-y-6">
                  <div className="p-5 bg-background rounded-full border shadow-sm ring-8 ring-primary/5">
                    <Wallet className="h-10 w-10 text-primary/40" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tight">Nenhum turno aberto</h3>
                    <p className="text-sm text-muted-foreground max-w-xs font-medium">
                      Para registrar vendas em dinheiro e ter controle de caixa, você precisa iniciar um novo turno.
                    </p>
                  </div>
                  <Button size="lg" className="font-black uppercase text-[11px] tracking-widest h-14 px-10" onClick={handleOpenCash} disabled={isOpening}>
                    {isOpening ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Abrir Caixa Agora
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-500/20 bg-green-50/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="text-green-500" />
                          Caixa em Operação
                      </CardTitle>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 uppercase font-black text-[9px]">
                        Ativo
                      </Badge>
                    </div>
                    <CardDescription className="font-bold">
                         Aberto em {format(parseISO(openSession!.opened_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })} ({formatDistanceToNow(parseISO(openSession!.opened_at), { locale: ptBR, addSuffix: true })})
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="p-4 bg-background border rounded-xl shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Fundo Inicial</p>
                            <p className="text-xl font-black">{formatCurrency(openSession!.opening_amount_cents)}</p>
                        </div>
                        <div className="p-4 bg-background border rounded-xl shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendas (Total)</p>
                            <p className="text-xl font-black text-primary">{formatCurrency(salesInOpenSession?.totalCents || 0)}</p>
                        </div>
                        <div className="p-4 bg-primary text-primary-foreground rounded-xl shadow-lg">
                            <p className="text-[10px] uppercase font-bold opacity-80">Dinheiro em Caixa</p>
                            <p className="text-xl font-black">{formatCurrency(openSession!.opening_amount_cents + (salesInOpenSession?.cash || 0))}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1"><Coins className="h-3 w-3" /> Dinheiro</span>
                          <span className="font-black text-sm">{formatCurrency(salesInOpenSession?.cash || 0)}</span>
                        </div>
                        <div className="flex flex-col border-l pl-4">
                          <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1"><PiggyBank className="h-3 w-3" /> PIX</span>
                          <span className="font-black text-sm">{formatCurrency(salesInOpenSession?.pix || 0)}</span>
                        </div>
                        <div className="flex flex-col border-l pl-4">
                          <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1"><CreditCard className="h-3 w-3" /> Cartão</span>
                          <span className="font-black text-sm">{formatCurrency(salesInOpenSession?.card || 0)}</span>
                        </div>
                    </div>
                </CardContent>
              </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" /> Histórico do Período</CardTitle>
                        <CardDescription>Consulte o faturamento consolidado por data.</CardDescription>
                      </div>
                      <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
                    </div>
                </CardHeader>
                <CardContent>
                    {!hasOpenCash && (
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3 mb-6">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <p className="text-xs text-orange-800 font-medium">Os dados abaixo refletem vendas passadas. Abra o caixa para registrar novas movimentações.</p>
                      </div>
                    )}
                    {reportData ? (
                       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                           <div className="p-4 border rounded-lg bg-muted/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Faturamento</p>
                                <p className="text-lg font-black">{formatCurrency(reportData.totalCents)}</p>
                           </div>
                           <div className="p-4 border rounded-lg bg-muted/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Em Dinheiro</p>
                                <p className="text-lg font-black">{formatCurrency(reportData.cash)}</p>
                           </div>
                           <div className="p-4 border rounded-lg bg-muted/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">PIX / Cartão</p>
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
                 <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Ações Operacionais</CardTitle></CardHeader>
                 <CardContent className="flex flex-col gap-3">
                     <Button variant="outline" className="w-full h-12 font-bold" onClick={() => router.push('/sales/new')}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Ir para Venda (PDV)
                     </Button>
                     <Button variant="ghost" className="w-full text-xs font-bold opacity-60" onClick={() => router.push('/reports')}>
                        Ver Relatórios Completos
                     </Button>
                 </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-3">
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest"><History className="h-4 w-4" /> Sessões Recentes</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                      <TableHeader className="bg-muted/10">
                          <TableRow>
                              <TableHead className="px-6">Período</TableHead>
                              <TableHead className="text-right">Fundo Inicial</TableHead>
                              <TableHead className="text-right">Vendas Dinheiro</TableHead>
                              <TableHead className="text-right">Saldo Final</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {cashSessionsSafe.length > 0 ? cashSessionsSafe.map(cr => {
                              const sessionSales = calculateSalesForPeriod(cr.opened_at, cr.closed_at);
                              const totalExpected = cr.opening_amount_cents + sessionSales.cash;
                              return (
                              <TableRow key={cr.id} className="hover:bg-muted/5 transition-colors">
                                  <TableCell className="px-6">
                                      <div className="flex flex-col text-xs">
                                        <span className="font-black uppercase">{format(parseISO(cr.opened_at), 'dd/MM/yy HH:mm')}</span>
                                        <span className="text-muted-foreground font-medium">{cr.closed_at ? format(parseISO(cr.closed_at), 'dd/MM/yy HH:mm') : 'Em andamento...'}</span>
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
                          )}) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-24 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Nenhuma sessão registrada</TableCell>
                            </TableRow>
                          )}
                      </TableBody>
                  </Table>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}
