
'use client';

/**
 * @fileOverview Gestão de Caixa Blindada.
 * Adicionada segurança contra arrays indefinidos para evitar TypeError (.filter).
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Coins, CreditCard, PiggyBank, Briefcase, History, CheckCircle, XCircle, PlusCircle, ArrowUpRight, Wallet } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';  
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';

import type { CashRegister } from '@/lib/types';
import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function CashPage() {
  const { cashRegisters, sales, store } = useAuth();
  const [openingAmount, setOpeningAmount] = useState('');
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const router = useRouter();
  
  const calculateSalesForPeriod = (fromStr: string, toStr: string | null) => {
    const fromDate = parseISO(fromStr);
    const toDate = toStr ? parseISO(toStr) : new Date();

    // 🔒 Blindagem: Garante que sales é um array
    const safeSales = Array.isArray(sales) ? sales : [];

    const totals = safeSales.filter(sale => {
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

  const safeCashRegisters = Array.isArray(cashRegisters) ? cashRegisters : [];
  const openCashRegister = useMemo(() => safeCashRegisters.find(cr => cr.closed_at === null), [safeCashRegisters]);
  
  const salesInOpenRegister = useMemo(() => 
    openCashRegister ? calculateSalesForPeriod(openCashRegister.opened_at, null) : null
  , [openCashRegister, sales]);

  const expectedCashInDrawer = useMemo(() => 
    openCashRegister && salesInOpenRegister 
      ? openCashRegister.opening_amount_cents + salesInOpenRegister.cash 
      : 0
  , [openCashRegister, salesInOpenRegister]);

  const totalFaturamentoSession = useMemo(() => 
    openCashRegister && salesInOpenRegister ? salesInOpenRegister.totalCents : 0
  , [salesInOpenRegister]);

  const reportData = useMemo(() => {
    if (!dateRange?.from) return null;
    const from = startOfDay(dateRange.from).toISOString();
    const to = endOfDay(dateRange.to || dateRange.from).toISOString();
    return calculateSalesForPeriod(from, to);
  }, [dateRange, sales]);

  return (
    <div className="space-y-8">
      <PageHeader title="Fluxo de Caixa" subtitle="Gestão financeira e fechamento de turno." />
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card className={openCashRegister ? "border-green-500/20 bg-green-50/5" : "border-muted"}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                          {openCashRegister ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                          Status do Caixa Atual
                      </CardTitle>
                      {openCashRegister && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Operando
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                         {openCashRegister ? `Aberto há ${formatDistanceToNow(parseISO(openCashRegister.opened_at), { locale: ptBR })}` : "Nenhum turno iniciado."}
                    </CardDescription>
                </CardHeader>
                {openCashRegister && salesInOpenRegister ? (
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="p-4 bg-background border rounded-xl shadow-sm">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Fundo Inicial</p>
                                <p className="text-xl font-black">{formatCurrency(openCashRegister.opening_amount_cents)}</p>
                            </div>
                            <div className="p-4 bg-background border rounded-xl shadow-sm">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendas (Total)</p>
                                <p className="text-xl font-black text-primary">{formatCurrency(totalFaturamentoSession)}</p>
                            </div>
                            <div className="p-4 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20">
                                <p className="text-[10px] uppercase font-bold opacity-80">Saldo em Dinheiro</p>
                                <p className="text-xl font-black">{formatCurrency(expectedCashInDrawer)}</p>
                                <p className="text-[9px] mt-1 opacity-70">Abertura + Dinheiro Físico</p>
                            </div>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                             <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                               <ArrowUpRight className="h-3 w-3" /> 
                               Entradas por Meio de Pagamento
                             </h4>
                             <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> Dinheiro</span>
                                  <span className="font-bold text-sm">{formatCurrency(salesInOpenRegister.cash)}</span>
                                </div>
                                <div className="flex flex-col border-l pl-4">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><PiggyBank className="h-3 w-3" /> PIX</span>
                                  <span className="font-bold text-sm">{formatCurrency(salesInOpenRegister.pix)}</span>
                                </div>
                                <div className="flex flex-col border-l pl-4">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> Cartão</span>
                                  <span className="font-bold text-sm">{formatCurrency(salesInOpenRegister.card)}</span>
                                </div>
                             </div>
                        </div>
                    </CardContent>
                ) : (
                  <CardContent className="py-10 text-center">
                    <Wallet className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">Abra o caixa para começar a registrar vendas.</p>
                  </CardContent>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" /> Relatórios do Período</CardTitle>
                        <CardDescription>Consulte o faturamento consolidado.</CardDescription>
                      </div>
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
                      <p className="text-center py-6 text-muted-foreground text-sm">Selecione uma data para visualizar os dados.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        
        <div className="space-y-6">
            <Card className="shadow-lg">
                 <CardHeader><CardTitle className="text-base">Ações Rápidas</CardTitle></CardHeader>
                 <CardContent className="flex flex-col gap-3">
                     <Button variant="outline" className="w-full h-12" onClick={() => router.push('/sales/new')}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Ir para Venda (PDV)
                     </Button>
                 </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico de Sessões</CardTitle>
                    <CardDescription>Registro dos últimos caixas abertos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                          <TableHeader className="bg-muted/50">
                              <TableRow>
                                  <TableHead>Período</TableHead>
                                  <TableHead className="text-right">Abertura</TableHead>
                                  <TableHead className="text-right">Dinheiro</TableHead>
                                  <TableHead className="text-right">Saldo Final</TableHead>
                                  <TableHead className="text-center">Status</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {safeCashRegisters.length > 0 ? safeCashRegisters.map(cr => {
                                  const salesData = calculateSalesForPeriod(cr.opened_at, cr.closed_at);
                                  const finalAmount = cr.opening_amount_cents + salesData.cash;
                                  return (
                                  <TableRow key={cr.id} className="hover:bg-muted/5 transition-colors">
                                      <TableCell>
                                          <div className="flex flex-col text-xs">
                                            <span className="font-bold">{format(parseISO(cr.opened_at), 'dd/MM/yy HH:mm')}</span>
                                            <span className="text-muted-foreground">{cr.closed_at ? format(parseISO(cr.closed_at), 'dd/MM/yy HH:mm') : 'Em aberto...'}</span>
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-right text-xs">{formatCurrency(cr.opening_amount_cents)}</TableCell>
                                      <TableCell className="text-right text-xs text-green-600 font-medium">+{formatCurrency(salesData.cash)}</TableCell>
                                      <TableCell className="text-right font-black">{formatCurrency(cr.closed_at ? (cr.closing_amount_cents || finalAmount) : finalAmount)}</TableCell>
                                      <TableCell className="text-center">
                                          <Badge variant={cr.closed_at ? 'secondary' : 'default'} className={cr.closed_at ? '' : 'bg-green-500 text-[10px]'}>
                                              {cr.closed_at ? 'Concluído' : 'Ativo'}
                                          </Badge>
                                      </TableCell>
                                  </TableRow>
                              )}) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                                </TableRow>
                              )}
                          </TableBody>
                      </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
