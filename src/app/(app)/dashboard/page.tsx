'use client';

import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, endOfDay } from 'date-fns';
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, Package, CheckCircle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  SalesByProductChart,
  SalesByPaymentMethodChart,
  StockByCategoryChart,
  SalesByCategoryChart,
} from '@/components/charts';
import { useAuth } from '@/components/auth-provider';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function DashboardPage() {
  const {
    user,
    store,
    storeStatus,
    fetchStoreData,
    products,
    sales,
    cashRegisters,
  } = useAuth();

  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });

   useEffect(() => {
    if (user && storeStatus === 'unknown') {
      fetchStoreData(user.id);
    }
  }, [user, storeStatus, fetchStoreData]);

  // Filtered data based on dateRange (simulation)
  const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      if (!dateRange?.from) {
          return false;
      }
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      return saleDate >= startOfToday() && saleDate <= toDate;
  });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_cents, 0);
  const totalSales = filteredSales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  
  const salesByPaymentMethod = filteredSales.reduce((acc, sale) => {
      acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total_cents;
      return acc;
  }, {} as Record<'cash' | 'pix' | 'card', number>);

  const salesByProduct = filteredSales
    .flatMap(sale => sale.items)
    .reduce((acc, item) => {
        acc[item.product_name_snapshot] = (acc[item.product_name_snapshot] || 0) + item.subtotal_cents;
        return acc;
    }, {} as Record<string, number>);

  const topProducts = Object.entries(salesByProduct).sort((a, b) => b[1] - a[1]).map(([name, total]) => ({ name, total }));

  const salesByCategory = filteredSales
    .flatMap(sale => sale.items)
    .map(item => {
        const product = products.find(p => p.id === item.product_id);
        return { ...item, category: product?.category || 'Sem categoria' };
    })
    .reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

   const topCategories = Object.entries(salesByCategory).sort((a,b) => b[1] - a[1]).map(([name, total]) => ({name, total}));

  const stockByCategory = products.reduce((acc, product) => {
    const category = product.category || 'Sem categoria';
    acc[category] = (acc[category] || 0) + product.stock_qty;
    return acc;
  }, {} as Record<string, number>);
  const stockByCategoryData = Object.entries(stockByCategory).map(([name, total]) => ({ name, total }));

  const criticalStockProducts = products.filter(p => p.active && p.stock_qty > 0 && p.min_stock_qty && p.stock_qty <= p.min_stock_qty);
  const productsWithoutSale = products.filter(p => p.stock_qty > 0 && !filteredSales.some(s => s.items.some(i => i.product_id === p.id)));

  const openCashRegister = cashRegisters.find(cr => cr.closed_at === null);
  const salesInOpenRegister = openCashRegister ? sales.filter(s => new Date(s.created_at) >= new Date(openCashRegister.opened_at)) : [];
  const revenueInOpenRegister = salesInOpenRegister.reduce((sum, sale) => sum + sale.total_cents, 0);
  const expectedClosing = openCashRegister ? openCashRegister.opening_amount_cents + revenueInOpenRegister : 0;

if (!user) {
  return <div className="p-6">Usuário não autenticado</div>;
}

if (storeStatus === 'loading') {
  return <div className="p-6">Carregando loja...</div>;
}

if (storeStatus === 'none') {
  return <div className="p-6">Você ainda não tem uma loja</div>;
}
  
  return (
    <>
      <PageHeader title="Dashboard">
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </PageHeader>

      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento no período</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Total de vendas no período selecionado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Número de vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSales}</div>
              <p className="text-xs text-muted-foreground">Vendas realizadas com sucesso</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageTicket)}</div>
              <p className="text-xs text-muted-foreground">Valor médio por venda</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Caixa atual</CardTitle>
              {openCashRegister ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Info className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                {openCashRegister ? (
                    <>
                        <div className="text-2xl font-bold text-green-600">Aberto</div>
                        <p className="text-xs text-muted-foreground">
                            Previsto: {formatCurrency(expectedClosing)}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="text-2xl font-bold">Fechado</div>
                         <p className="text-xs text-muted-foreground">Nenhum caixa aberto no momento</p>
                    </>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
            <SalesByProductChart data={topProducts} />
            <SalesByPaymentMethodChart data={Object.entries(salesByPaymentMethod).map(([name, value]) => ({ name: name as 'cash' | 'pix' | 'card', value }))} />
            <StockByCategoryChart data={stockByCategoryData} />
            <SalesByCategoryChart data={topCategories} />
        </div>
        
        {/* Insights Section */}
        <div className="space-y-6">
            <h2 className="text-2xl font-headline font-bold">Insights</h2>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Estoque Crítico</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {criticalStockProducts.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead className="text-right">Estoque</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {criticalStockProducts.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell>{p.category}</TableCell>
                                            <TableCell className="text-right font-bold text-destructive">{p.stock_qty}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum produto com estoque crítico.</p>
                        )}
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/products')}>Ir para Produtos</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Package/>Produtos Parados</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {productsWithoutSale.length > 0 ? (
                            <>
                                <p className="text-sm text-muted-foreground mb-4">Produtos com estoque que não foram vendidos no período selecionado.</p>
                                <div className="max-h-48 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead className="text-right">Estoque</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productsWithoutSale.slice(0, 5).map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell className="text-right">{p.stock_qty}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </>
                         ) : (
                             <p className="text-sm text-muted-foreground">Todos os produtos com estoque tiveram vendas no período.</p>
                         )}
                         <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/products')}>Criar promoção</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </>
  );
}
