'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
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

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function CashPage() {
  const { cashRegisters, setCashRegisters, sales, store } = useAuth();
  const [openingAmount, setOpeningAmount] = useState('');
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const router = useRouter();
  
  /**
   * Calcula totais de vendas em um intervalo de tempo específico.
   * Útil para o caixa aberto e para o histórico.
   */
  const calculateSalesForPeriod = (fromStr: string, toStr: string | null) => {
    const fromDate = parseISO(fromStr);
    const toDate = toStr ? parseISO(toStr) : new Date();

    const salesInPeriod = sales.filter(sale => {
      const saleDate = parseISO(sale.created_at);
      // Usando comparação direta de milissegundos para evitar bugs de arredondamento
      return saleDate.getTime() >= fromDate.getTime() && saleDate.getTime() <= toDate.getTime();
    });

    const totals = salesInPeriod.reduce((acc, sale) => {
      acc.totalCents += sale.total_cents;
      acc.count += 1;
      if (sale.payment_method === 'cash') acc.cash += sale.total_cents;
      if (sale.payment_method === 'pix') acc.pix += sale.total_cents;
      if (sale.payment_method === 'card') acc.card += sale.total_cents;
      return acc;
    }, { totalCents: 0, count: 0, cash: 0, pix: 0, card: 0 });

    return totals;
  };

  const openCashRegister = useMemo(() => cashRegisters.find(cr => cr.closed_at === null), [cashRegisters]);
  
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

  // Relatório Rápido (Baseado no seletor de data)
  const reportData = useMemo(() => {
    if (!dateRange?.from) return null;
    const from = startOfDay(dateRange.from).toISOString();
    const to = endOfDay(dateRange.to || dateRange.from).toISOString();
    return calculateSalesForPeriod(from, to);
  }, [dateRange, sales]);

  const handleOpenCashRegister = async () => {
    if (!store) return;
    const amountCents = Math.round(parseFloat(openingAmount.replace(',', '.')) * 100);
    if (isNaN(amountCents) || amountCents < 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Insira um valor de abertura válido.' });
      return;
    }
    
    const newRegister: Partial<CashRegister> = {
      opened_at: new Date().toISOString(),
      closed_at: null,
      opening_amount_cents: amountCents,
      closing_amount_cents: null,
    };

    try {
      await setCashRegisters((prev: CashRegister[]) => [newRegister as CashRegister, ...prev]);
      setOpeningAmount('');
      toast({ title: 'Caixa aberto!', description: `Saldo inicial: ${formatCurrency(amountCents)}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao abrir caixa' });
    }
  };
  
  const handleCloseCashRegister = async () => {
      if (!openCashRegister || !salesInOpenRegister) return;
      const closingAmount = expectedCashInDrawer; // Fechamento baseado no dinheiro físico + abertura
      
      try {
        await setCashRegisters((prev: CashRegister[]) => prev.map(cr => 
          cr.id === openCashRegister.id 
            ? { ...cr, closed_at: new Date().toISOString(), closing_amount_cents: closingAmount } 
            : cr
        ));
        toast({ title: 'Caixa fechado!', description: `Valor final em dinheiro: ${formatCurrency(closingAmount)}` });
      } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao fechar caixa' });
      }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Fluxo de Caixa" subtitle="Gestão financeira e fechamento de turno." />
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal: Status Atual */}
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
                    <p className="text-muted-foreground text-sm">Abra o caixa para começar a registrar vendas e monitorar o faturamento.</p>
                  </CardContent>
                )}
            </Card>

            {/* Relatórios Rápidos */}
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
        
        {/* Coluna Lateral: Ações */}
        <div className="space-y-6">
            <Card className="shadow-lg">
                 <CardHeader><CardTitle className="text-base">Ações Rápidas</CardTitle></CardHeader>
                 <CardContent className="flex flex-col gap-3">
                     {openCashRegister ? (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button className="w-full h-12 text-base font-bold" variant="destructive">
                                Fechar Turno
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar fechamento?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O caixa será encerrado com o valor de <span className="font-black text-foreground">{formatCurrency(expectedCashInDrawer)}</span> em dinheiro físico esperado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleCloseCashRegister} className="bg-destructive hover:bg-destructive/90">
                                      Confirmar Fechamento
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                     ) : (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button className="w-full h-12 text-base font-bold shadow-primary/20 shadow-lg">
                                Iniciar Turno (Abrir)
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Abrir Novo Caixa</AlertDialogTitle>
                                  <AlertDialogDescription>Informe o valor inicial em dinheiro (fundo de troco).</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4">
                                    <Input 
                                      placeholder="R$ 0,00" 
                                      value={openingAmount} 
                                      onChange={e => setOpeningAmount(e.target.value)} 
                                      className="text-2xl h-14 text-center font-black"
                                      autoFocus 
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleOpenCashRegister}>Abrir Caixa</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                     )}
                     <Button variant="outline" className="w-full h-12" onClick={() => router.push('/sales/new')}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Ir para Venda (PDV)
                     </Button>
                 </CardContent>
            </Card>
        </div>

        {/* Histórico Detalhado */}
        <div className="lg:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico de Sessões</CardTitle>
                    <CardDescription>Registro dos últimos 30 caixas abertos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                          <TableHeader className="bg-muted/50">
                              <TableRow>
                                  <TableHead>Período (Início/Fim)</TableHead>
                                  <TableHead className="text-right">Fundo Inicial</TableHead>
                                  <TableHead className="text-right">Vendas (Dinheiro)</TableHead>
                                  <TableHead className="text-right">Saldo Final</TableHead>
                                  <TableHead className="text-center">Status</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {cashRegisters.length > 0 ? cashRegisters.map(cr => {
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
                                          <Badge variant={cr.closed_at ? 'secondary' : 'default'} className={cn("text-[10px]", cr.closed_at ? '' : 'bg-green-500')}>
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
