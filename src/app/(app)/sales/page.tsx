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
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const paymentMethodIcons = {
  cash: <Coins className="h-4 w-4" />,
  pix: <PiggyBank className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
};

const paymentMethodLabels = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
};

export default function SalesPage() {
  const router = useRouter();
  const { sales, store } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: addDays(startOfToday(), -29), to: new Date() });
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const filteredSales = useMemo(() => {
    return sales
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
          sale.items.some(
            item =>
              item.product_name_snapshot.toLowerCase().includes(lowerCaseQuery) ||
              (item.product_barcode_snapshot &&
                item.product_barcode_snapshot.toLowerCase().includes(lowerCaseQuery))
          )
        );
      });
  }, [sales, dateRange, searchQuery, paymentFilter]);

  const kpiData = useMemo(() => {
    const totalCents = filteredSales.reduce((sum, sale) => sum + sale.total_cents, 0);
    const salesCount = filteredSales.length;
    const averageTicket = salesCount > 0 ? totalCents / salesCount : 0;
    return { totalCents, salesCount, averageTicket };
  }, [filteredSales]);

  return (
    <>
      <PageHeader title="Vendas" subtitle="Histórico e detalhes das transações.">
        <Button onClick={() => router.push('/sales/new')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Venda
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento do período</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpiData.totalCents)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas no período</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiData.salesCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpiData.averageTicket)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, produto ou cód. de barras..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Pagamentos</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length > 0 ? (
                  filteredSales.map(sale => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        {format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.total_cents)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-2">
                           {paymentMethodIcons[sale.payment_method]} {paymentMethodLabels[sale.payment_method]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{sale.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Detalhes da Venda</DialogTitle>
                              <DialogDescription>
                                ID da Venda: {sale.id}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                               <div className="text-sm">
                                  <p><strong>Data:</strong> {format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                                  <p><strong>Total:</strong> {formatCurrency(sale.total_cents)}</p>
                                  <p><strong>Pagamento:</strong> {paymentMethodLabels[sale.payment_method]}</p>
                               </div>
                               <Table>
                                 <TableHeader>
                                   <TableRow>
                                     <TableHead>Produto</TableHead>
                                     <TableHead>Qtd.</TableHead>
                                     <TableHead>Unit.</TableHead>
                                     <TableHead className="text-right">Subtotal</TableHead>
                                   </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                   {sale.items.map((item, index) => (
                                     <TableRow key={index}>
                                       <TableCell>{item.product_name_snapshot}</TableCell>
                                       <TableCell>{item.quantity}</TableCell>
                                       <TableCell>{formatCurrency(item.unit_price_cents)}</TableCell>
                                       <TableCell className="text-right">{formatCurrency(item.subtotal_cents)}</TableCell>
                                     </TableRow>
                                   ))}
                                 </TableBody>
                               </Table>
                            </div>
                            <DialogFooter>
                                <Button 
                                    variant="outline" 
                                    onClick={() => store && printReceipt(sale, store)} 
                                    disabled={!store}
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Imprimir Cupom
                                </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Sem vendas no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
