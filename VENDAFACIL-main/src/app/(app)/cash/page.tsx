'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Coins, CreditCard, PiggyBank, Briefcase, History, CheckCircle, XCircle, PlusCircle } from 'lucide-react';

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
  const { cashRegisters, setCashRegisters, sales, products, store } = useAuth();
  const [openingAmount, setOpeningAmount] = useState('');
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const router = useRouter();
  
  const calculateSalesForPeriod = (from: string, to: string | null) => {
    const fromDate = parseISO(from);
    const toDate = to ? parseISO(to) : new Date();

    const salesInPeriod = sales.filter(sale => {
      const saleDate = parseISO(sale.created_at);
      return saleDate >= fromDate && saleDate <= toDate;
    });

    const totals = salesInPeriod.reduce((acc, sale) => {
      acc.totalCents += sale.total_cents;
      acc.count += 1;
      acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total_cents;
      return acc;
    }, { totalCents: 0, count: 0, cash: 0, pix: 0, card: 0 });

    const cost = salesInPeriod.flatMap(s => s.items).reduce((acc, item) => {
        const product = products.find(p => p.id === item.product_id);
        return acc + (product?.cost_cents ?? 0) * item.quantity;
    }, 0);
    
    const profit = totals.totalCents - cost;
    const margin = totals.totalCents > 0 ? (profit / totals.totalCents) * 100 : 0;

    return { ...totals, cost, profit, margin };
  }

  const openCashRegister = cashRegisters.find(cr => cr.closed_at === null);
  
  const salesInOpenRegister = openCashRegister ? calculateSalesForPeriod(openCashRegister.opened_at, null) : null;
  const expectedClosing = openCashRegister && salesInOpenRegister ? openCashRegister.opening_amount_cents + salesInOpenRegister.totalCents : 0;
  
  const reportData = dateRange?.from ? calculateSalesForPeriod(dateRange.from.toISOString(), dateRange.to ? dateRange.to.toISOString() : dateRange.from.toISOString()) : null;

  const handleOpenCashRegister = () => {
    if (!store) return;
    const amountCents = Math.round(parseFloat(openingAmount.replace(',', '.')) * 100);
    if (isNaN(amountCents) || amountCents < 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Por favor, insira um valor de abertura válido.' });
      return;
    }
    const newRegister: CashRegister = {
      id: `cash_${Date.now()}`,
      store_id: store.id,
      opened_at: new Date().toISOString(),
      closed_at: null,
      opening_amount_cents: amountCents,
      closing_amount_cents: null,
    };
    setCashRegisters(prev => [newRegister, ...prev]);
    setOpeningAmount('');
    toast({ title: 'Caixa aberto com sucesso!', description: `Abertura: ${formatCurrency(amountCents)}` });
  };
  
  const handleCloseCashRegister = () => {
      if (!openCashRegister || !salesInOpenRegister) return;
      const closingAmount = openCashRegister.opening_amount_cents + salesInOpenRegister.totalCents;
      setCashRegisters(prev => prev.map(cr => cr.id === openCashRegister.id ? { ...cr, closed_at: new Date().toISOString(), closing_amount_cents: closingAmount } : cr));
      toast({ title: 'Caixa fechado com sucesso!', description: `Valor final: ${formatCurrency(closingAmount)}` });
  }

  return (
    <>
      <PageHeader title="Caixa" subtitle="Controle financeiro do dia a dia." />
      
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
            {/* Current Register Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {openCashRegister ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                        Status do Caixa Atual
                    </CardTitle>
                    <CardDescription>
                         {openCashRegister ? `Aberto há ${formatDistanceToNow(parseISO(openCashRegister.opened_at), { locale: ptBR })}` : "Nenhum caixa aberto no momento."}
                    </CardDescription>
                </CardHeader>
                {openCashRegister && salesInOpenRegister && (
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Abertura</p>
                                <p className="text-xl font-bold">{formatCurrency(openCashRegister.opening_amount_cents)}</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Entrou (Vendas)</p>
                                <p className="text-xl font-bold">{formatCurrency(salesInOpenRegister.totalCents)}</p>
                            </div>
                            <div className="p-4 bg-primary text-primary-foreground rounded-lg">
                                <p className="text-sm">Final Previsto</p>
                                <p className="text-xl font-bold">{formatCurrency(expectedClosing)}</p>
                            </div>
                        </div>
                        <div>
                             <h4 className="font-semibold text-sm mb-2">Entradas por Forma de Pagamento</h4>
                             <div className="flex gap-4 text-sm">
                                <span className="flex items-center gap-1"><Coins className="h-4 w-4 text-muted-foreground" /> Dinheiro: {formatCurrency(salesInOpenRegister.cash)}</span>
                                <span className="flex items-center gap-1"><PiggyBank className="h-4 w-4 text-muted-foreground" /> Pix: {formatCurrency(salesInOpenRegister.pix)}</span>
                                <span className="flex items-center gap-1"><CreditCard className="h-4 w-4 text-muted-foreground" /> Cartão: {formatCurrency(salesInOpenRegister.card)}</span>
                             </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Quick Reports */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase /> Relatórios Rápidos</CardTitle>
                    <div className="flex justify-between items-center">
                        <CardDescription>Visualize o faturamento para qualquer período.</CardDescription>
                        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                    </div>
                </CardHeader>
                {reportData && (
                    <CardContent className="space-y-4">
                       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                           <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                                <p className="text-lg font-bold">{formatCurrency(reportData.totalCents)}</p>
                           </div>
                           <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Lucro Estimado</p>
                                <p className="text-lg font-bold">{formatCurrency(reportData.profit)}</p>
                           </div>
                           <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Margem</p>
                                <p className="text-lg font-bold">{reportData.margin.toFixed(1)}%</p>
                           </div>
                           <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Vendas</p>
                                <p className="text-lg font-bold">{reportData.count}</p>
                           </div>
                       </div>
                    </CardContent>
                )}
            </Card>
        </div>
        
        {/* Actions Column */}
        <div className="space-y-6">
            <Card>
                 <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
                 <CardContent className="flex flex-col gap-2">
                     {openCashRegister ? (
                         <AlertDialog>
                            <AlertDialogTrigger asChild><Button className="w-full" variant="destructive">Fechar Caixa</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Confirmar fechamento do caixa?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogDescription>O caixa será fechado com o valor final de {formatCurrency(expectedClosing)}, calculado a partir da abertura e das vendas no período. Esta ação não pode ser desfeita.</AlertDialogDescription>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleCloseCashRegister}>Confirmar Fechamento</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                     ) : (
                         <AlertDialog>
                            <AlertDialogTrigger asChild><Button className="w-full">Abrir Caixa</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Abrir Novo Caixa</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogDescription>Insira o valor inicial em dinheiro para a abertura do caixa.</AlertDialogDescription>
                                <div className="py-4">
                                    <Input placeholder="R$ 0,00" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} autoFocus />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleOpenCashRegister}>Abrir Caixa</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                     )}
                     <Button variant="outline" className="w-full" onClick={() => router.push('/sales/new')}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Ir para Venda
                     </Button>
                 </CardContent>
            </Card>
        </div>

        {/* History */}
        <div className="lg:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History /> Histórico de Caixas</CardTitle>
                    <CardDescription>Visualize todos os caixas abertos e fechados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Período</TableHead>
                                <TableHead className="text-right">Abertura</TableHead>
                                <TableHead className="text-right">Entrou (Vendas)</TableHead>
                                <TableHead className="text-right">Final</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cashRegisters.map(cr => {
                                const salesData = calculateSalesForPeriod(cr.opened_at, cr.closed_at);
                                const finalAmount = cr.opening_amount_cents + salesData.totalCents;
                                return (
                                <TableRow key={cr.id}>
                                    <TableCell>
                                        <p className="font-medium">{format(parseISO(cr.opened_at), 'dd/MM/yy HH:mm')}</p>
                                        <p className="text-sm text-muted-foreground">até {cr.closed_at ? format(parseISO(cr.closed_at), 'dd/MM/yy HH:mm') : 'agora'}</p>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(cr.opening_amount_cents)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(salesData.totalCents)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(finalAmount)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={cr.closed_at ? 'secondary' : 'default'} className={cr.closed_at ? '' : 'bg-green-500'}>
                                            {cr.closed_at ? 'Fechado' : 'Aberto'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
