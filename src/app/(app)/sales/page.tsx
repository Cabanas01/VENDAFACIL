'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, addDays, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, PlusCircle, DollarSign, ShoppingCart, TrendingUp, MoreHorizontal, CreditCard, Coins, PiggyBank, Printer } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/auth-provider';
import type { Sale } from '@/lib/types';
import { startOfDay, endOfDay } from 'date-fns';
import { printReceipt } from '@/lib/print-receipt';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

const paymentMethodIcons = {
  cash: <Coins className="h-4 w-4" />,
  pix: <PiggyBank className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  dinheiro: <Coins className="h-4 w-4" />,
  credito: <CreditCard className="h-4 w-4" />,
  debito: <CreditCard className="h-4 w-4" />,
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
  dinheiro: 'Dinheiro',
  credito: 'Crédito',
  debito: 'Débito'
};

export default function SalesPage() {
  const router = useRouter();
  const { sales, store } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: addDays(startOfToday(), -29), to: new Date() });
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const filteredSales = useMemo(() => {
    const safeSales = Array.isArray(sales) ? sales : [];
    return safeSales
      .filter(sale => {
        if (!dateRange?.from) return true;
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const saleDate = parseISO(sale.created_at);
        return saleDate >= fromDate && saleDate <= toDate;
      })
      .filter(sale => paymentFilter === 'all' || sale.payment_method === paymentFilter)
      .filter(sale => {
        if (!searchQuery) return true;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return (
          sale.id.toLowerCase().includes(lowerCaseQuery) ||
          (sale.items || []).some(
            item =>
              item.product_name_snapshot?.toLowerCase().includes(lowerCaseQuery)
          )
        );
      });
  }, [sales, dateRange, searchQuery, paymentFilter]);

  const kpiData = useMemo(() => {
    const totalCents = filteredSales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0);
    const salesCount = filteredSales.length;
    const averageTicket = salesCount > 0 ? totalCents / salesCount : 0;
    return { totalCents, salesCount, averageTicket };
  }, [filteredSales]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Histórico de Vendas" subtitle="Controle total das transações realizadas em sua unidade.">
        <Button onClick={() => router.push('/sales/new')} className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Venda
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Faturamento Período</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tighter">{formatCurrency(kpiData.totalCents)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendas Totais</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tighter">{kpiData.salesCount}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tighter">{formatCurrency(kpiData.averageTicket)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-4 p-6 bg-muted/10 border-b">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID ou produto..."
                className="pl-10 h-11 bg-background"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Pagamentos</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credito">Cartão Crédito</SelectItem>
                <SelectItem value="debito">Cartão Débito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="px-6 font-black uppercase text-[10px]">Data/Hora</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px]">Valor Total</TableHead>
                  <TableHead className="px-6 font-black uppercase text-[10px]">Pagamento</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px]">Itens</TableHead>
                  <TableHead className="text-right px-6 font-black uppercase text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length > 0 ? (
                  filteredSales.map(sale => (
                    <TableRow key={sale.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="px-6 py-4 font-bold text-xs uppercase">
                        {format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right font-black text-primary text-base">
                        {formatCurrency(sale.total_cents)}
                      </TableCell>
                      <TableCell className="px-6">
                        <Badge variant="outline" className="flex items-center gap-2 text-[10px] font-black uppercase h-6 bg-background border-primary/10">
                           {paymentMethodIcons[sale.payment_method as keyof typeof paymentMethodIcons]} 
                           {paymentMethodLabels[sale.payment_method as keyof typeof paymentMethodLabels] || sale.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs text-muted-foreground">
                        {(sale.items || []).reduce((acc, item) => acc + item.quantity, 0)}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-primary hover:text-white transition-colors"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
                            <div className="bg-primary/5 p-8 border-b">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Detalhes da Transação</DialogTitle>
                                <DialogDescription className="font-mono text-[9px] uppercase tracking-widest mt-1">ID: {sale.id}</DialogDescription>
                              </DialogHeader>
                            </div>
                            
                            <div className="p-8 space-y-6">
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-muted/20 rounded-2xl border border-primary/5">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Data da Venda</p>
                                    <p className="text-sm font-black uppercase">{format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                                  </div>
                                  <div className="p-4 bg-muted/20 rounded-2xl border border-primary/5 text-right">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Método</p>
                                    <p className="text-sm font-black uppercase text-primary">{paymentMethodLabels[sale.payment_method as keyof typeof paymentMethodLabels] || sale.payment_method}</p>
                                  </div>
                               </div>

                               <div className="rounded-2xl border overflow-hidden">
                                 <Table>
                                   <TableHeader className="bg-muted/30">
                                     <TableRow>
                                       <TableHead className="text-[9px] font-black uppercase">Produto</TableHead>
                                       <TableHead className="text-center text-[9px] font-black uppercase">Qtd</TableHead>
                                       <TableHead className="text-right text-[9px] font-black uppercase">Total</TableHead>
                                     </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                     {(sale.items || []).map((item, index) => (
                                       <TableRow key={index} className="text-xs font-bold">
                                         <TableCell className="uppercase">{item.product_name_snapshot}</TableCell>
                                         <TableCell className="text-center">x{item.quantity}</TableCell>
                                         <TableCell className="text-right font-black">{formatCurrency(item.line_total)}</TableCell>
                                       </TableRow>
                                     ))}
                                   </TableBody>
                                 </Table>
                               </div>

                               <div className="flex justify-between items-center px-4">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Valor Consolidado</span>
                                  <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(sale.total_cents)}</span>
                               </div>
                            </div>

                            <DialogFooter className="bg-muted/10 p-6 flex-row gap-3">
                                <Button 
                                    className="flex-1 h-12 font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20"
                                    onClick={() => store && printReceipt(sale, store)} 
                                    disabled={!store}
                                >
                                    <Printer className="mr-2 h-4 w-4" /> Reemitir Cupom
                                </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">
                      Nenhuma transação localizada no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
