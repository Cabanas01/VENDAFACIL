'use client';

import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, endOfDay } from 'date-fns';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Package,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  SalesByProductChart,
  SalesByPaymentMethodChart,
  StockByCategoryChart,
  SalesByCategoryChart,
} from '@/components/charts';
import { useAuth } from '@/components/auth-provider';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);

export default function DashboardPage() {
  const {
    user,
    storeStatus,
    fetchStoreData,
    products,
    sales,
    cashRegisters,
  } = useAuth();

  const router = useRouter();

  // 🔒 BLINDAGEM TOTAL (NUNCA QUEBRA)
  const safeSales = Array.isArray(sales) ? sales : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCashRegisters = Array.isArray(cashRegisters)
    ? cashRegisters
    : [];

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });

  // 🔄 Garante carregamento da loja
  useEffect(() => {
    if (user && storeStatus === 'unknown') {
      fetchStoreData(user.id);
    }
  }, [user, storeStatus, fetchStoreData]);

  // 📅 FILTRO DE VENDAS
  const filteredSales = safeSales.filter((sale) => {
    if (!dateRange?.from) return false;

    const saleDate = new Date(sale.created_at);
    const fromDate = startOfToday();
    const toDate = dateRange.to
      ? endOfDay(dateRange.to)
      : endOfDay(dateRange.from);

    return saleDate >= fromDate && saleDate <= toDate;
  });

  // 📊 KPIs
  const totalRevenue = filteredSales.reduce(
    (sum, sale) => sum + sale.total_cents,
    0
  );
  const totalSales = filteredSales.length;
  const averageTicket =
    totalSales > 0 ? totalRevenue / totalSales : 0;

  // 💳 VENDAS POR MÉTODO
  const salesByPaymentMethod = filteredSales.reduce(
    (acc, sale) => {
      acc[sale.payment_method] =
        (acc[sale.payment_method] || 0) + sale.total_cents;
      return acc;
    },
    {} as Record<'cash' | 'pix' | 'card', number>
  );

  // 🛒 VENDAS POR PRODUTO
  const salesByProduct = filteredSales
    .flatMap((sale) =>
      Array.isArray(sale.items) ? sale.items : []
    )
    .reduce((acc, item) => {
      acc[item.product_name_snapshot] =
        (acc[item.product_name_snapshot] || 0) +
        item.subtotal_cents;
      return acc;
    }, {} as Record<string, number>);

  const topProducts = Object.entries(salesByProduct)
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => ({ name, total }));

  // 🧾 VENDAS POR CATEGORIA
  const salesByCategory = filteredSales
    .flatMap((sale) =>
      Array.isArray(sale.items) ? sale.items : []
    )
    .map((item) => {
      const product = safeProducts.find(
        (p) => p.id === item.product_id
      );
      return {
        ...item,
        category: product?.category || 'Sem categoria',
      };
    })
    .reduce((acc, item) => {
      acc[item.category] =
        (acc[item.category] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);

  const topCategories = Object.entries(salesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => ({ name, total }));

  // 📦 ESTOQUE POR CATEGORIA
  const stockByCategory = safeProducts.reduce((acc, product) => {
    const category = product.category || 'Sem categoria';
    acc[category] = (acc[category] || 0) + product.stock_qty;
    return acc;
  }, {} as Record<string, number>);

  const stockByCategoryData = Object.entries(stockByCategory).map(
    ([name, total]) => ({ name, total })
  );

  // ⚠️ INSIGHTS
  const criticalStockProducts = safeProducts.filter(
    (p) =>
      p.active &&
      p.stock_qty > 0 &&
      p.min_stock_qty &&
      p.stock_qty <= p.min_stock_qty
  );

  const productsWithoutSale = safeProducts.filter(
    (p) =>
      p.stock_qty > 0 &&
      !filteredSales.some((s) =>
        (Array.isArray(s.items) ? s.items : []).some(
          (i) => i.product_id === p.id
        )
      )
  );

  // 💰 CAIXA
  const openCashRegister = safeCashRegisters.find(
    (cr) => cr.closed_at === null
  );

  const salesInOpenRegister = openCashRegister
    ? safeSales.filter(
        (s) =>
          new Date(s.created_at) >=
          new Date(openCashRegister.opened_at)
      )
    : [];

  const revenueInOpenRegister = salesInOpenRegister.reduce(
    (sum, sale) => sum + sale.total_cents,
    0
  );

  const expectedClosing = openCashRegister
    ? openCashRegister.opening_amount_cents +
      revenueInOpenRegister
    : 0;

  // 🧱 ESTADOS DE BLOQUEIO
  if (!user) {
    return <div className="p-6">Usuário não autenticado</div>;
  }

  if (storeStatus === 'loading') {
    return <div className="p-6">Carregando loja...</div>;
  }

  if (storeStatus === 'none') {
    return <div className="p-6">Você ainda não tem uma loja</div>;
  }

  // 🖥️ RENDER
  return (
    <>
      <PageHeader title="Dashboard">
        <DateRangePicker
          date={dateRange}
          onDateChange={setDateRange}
        />
      </PageHeader>

      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex justify-between pb-2">
              <CardTitle>Faturamento</CardTitle>
              <DollarSign />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between pb-2">
              <CardTitle>Vendas</CardTitle>
              <ShoppingCart />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalSales}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between pb-2">
              <CardTitle>Ticket médio</CardTitle>
              <TrendingUp />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(averageTicket)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between pb-2">
              <CardTitle>Caixa</CardTitle>
              {openCashRegister ? (
                <CheckCircle className="text-green-500" />
              ) : (
                <Info />
              )}
            </CardHeader>
            <CardContent>
              {openCashRegister ? (
                <>
                  <div className="text-green-600 font-bold">
                    Aberto
                  </div>
                  <p>
                    Previsto:{' '}
                    {formatCurrency(expectedClosing)}
                  </p>
                </>
              ) : (
                <div>Fechado</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GRÁFICOS */}
        <div className="grid gap-6 md:grid-cols-2">
          <SalesByProductChart data={topProducts} />
          <SalesByPaymentMethodChart
            data={Object.entries(salesByPaymentMethod).map(
              ([name, value]) => ({
                name: name as 'cash' | 'pix' | 'card',
                value,
              })
            )}
          />
          <StockByCategoryChart data={stockByCategoryData} />
          <SalesByCategoryChart data={topCategories} />
        </div>
      </div>
    </>
  );
}
