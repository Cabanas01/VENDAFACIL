'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, format, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, ShoppingCart, TrendingUp, Search, Download, CircleAlert } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth-provider';
import type { Sale } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function SalesPage() {
  const { sales } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfToday(),
    to: startOfToday(),
  });
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const router = useRouter();

  const filteredSales = sales
    .filter(sale => {
      if (!dateRange?.from) {
          return false;
      }
      const saleDate = new Date(sale.created_at);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      return saleDate >= dateRange.from && saleDate <= toDate;
    })
    .filter(sale => paymentFilter === 'all' || sale.payment_method === paymentFilter)
    .filter(sale => sale.id.toLowerCase().includes(searchQuery.toLowerCase()) || sale.items.some(item => item.product_name_snapshot.toLowerCase().includes(searchQuery.toLowerCase())));

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_cents, 0);
  const totalSalesCount = filteredSales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  
  const paymentDistribution = filteredSales.reduce((acc, sale) => {
    acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total_cents;
    return acc;
  }, { cash: 0, pix: 0, card: 0 });

  const exportCSV = (data: Sale[], type: 'sales' | 'items') => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (type === 'sales') {
        csvContent += "id,created_at,payment_method,total_cents\n";
        data.forEach(sale => {
            const row = [sale.id, sale.created_at, sale.payment_method, sale.total_cents].join(",");
            csvContent += row + "\n";
        });
    } else {
        csvContent += "sale_id,product_id,product_name_snapshot,quantity,unit_price_cents,subtotal_cents\n";
        data.forEach(sale => {
            sale.items.forEach(item => {
                const row = [item.sale_id, item.product_id, `"${item.product_name_snapshot}"`, item.quantity, item.unit_price_cents, item.subtotal_cents].join(",");
                csvContent += row + "\n";
            });
        });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const checkSaleIntegrity = (sale: Sale | null) => {
      if (!sale) return { consistent: false, difference: 0 };
      const itemsTotal = sale.items.reduce((sum, item) => sum + item.subtotal_cents, 0);
      return {
          consistent: itemsTotal === sale.total_cents,
          difference: sale.total_cents - itemsTotal
      };
  }

  return (
    <>
      <PageHeader title="Vendas" subtitle="Histórico e detalhes das transações">
        <Button onClick={() => router.push('/sales/new')} className="bg-primary hover:bg-primary/90">
            Nova venda
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                        Faturamento do período <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                        Vendas no período <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{totalSalesCount}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                        Ticket Médio <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(averageTicket)}</p>
                </CardContent>
            </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
            <CardContent className="pt-6 flex flex-wrap items-center gap-4">
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="pix">Pix</SelectItem>
                        <SelectItem value="card">Cartão</SelectItem>
                    </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por ID ou produto..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => exportCSV(filteredSales, 'sales')}><Download className="mr-2 h-4 w-4" />Exportar Vendas</Button>
                    <Button variant="outline" onClick={() => exportCSV(filteredSales, 'items')}><Download className="mr-2 h-4 w-4" />Exportar Itens</Button>
                </div>
            </CardContent>
        </Card>
        
        {/* Sales Table */}
        <Card>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead className="text-center">Itens</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSales.length > 0 ? filteredSales.map(sale => (
                            <TableRow key={sale.id}>
                                <TableCell>{format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(sale.total_cents)}</TableCell>
                                <TableCell>
                                    <Badge variant={sale.payment_method === 'cash' ? 'secondary' : sale.payment_method === 'pix' ? 'default' : 'outline'}>
                                        {sale.payment_method === 'cash' ? 'Dinheiro' : sale.payment_method === 'pix' ? 'Pix' : 'Cartão'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                                <TableCell><Badge variant="outline" className="text-green-600 border-green-600">OK</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedSale(sale)}>Ver detalhes</Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Sem vendas no período.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      {/* Sale Details Sheet */}
      <Sheet open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalhes da Venda</SheetTitle>
            <SheetDescription>ID: {selectedSale?.id}</SheetDescription>
          </SheetHeader>
          {selectedSale && (
            <div className="py-4 space-y-4">
                <div className="space-y-1 text-sm">
                    <p><strong>Data:</strong> {format(new Date(selectedSale.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                    <p><strong>Forma de Pagamento:</strong> <Badge variant={selectedSale.payment_method === 'cash' ? 'secondary' : selectedSale.payment_method === 'pix' ? 'default' : 'outline'}>{selectedSale.payment_method}</Badge></p>
                    <p className="text-lg"><strong>Total:</strong> {formatCurrency(selectedSale.total_cents)}</p>
                </div>
                <Separator />
                <div>
                    <h4 className="font-semibold mb-2">Itens Vendidos</h4>
                    <div className="space-y-2">
                        {selectedSale.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-medium">{item.product_name_snapshot}</p>
                                    <p className="text-muted-foreground">{item.quantity} x {formatCurrency(item.unit_price_cents)}</p>
                                </div>
                                <p>{formatCurrency(item.subtotal_cents)}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <Separator />
                <div>
                    <h4 className="font-semibold mb-2">Auditoria</h4>
                    {checkSaleIntegrity(selectedSale).consistent ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                           Consistente
                        </Badge>
                    ) : (
                        <Badge variant="destructive">
                            <CircleAlert className="mr-1 h-3 w-3" /> Divergente (Diferença: {formatCurrency(checkSaleIntegrity(selectedSale).difference)})
                        </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">Verifica se o total da venda corresponde à soma dos itens.</p>
                </div>
                <Separator />
                 <div className="flex flex-col gap-2 pt-4">
                    <Button>Imprimir Recibo</Button>
                    <Button variant="outline">Repetir Itens no Carrinho</Button>
                </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
