'use client';

import { useState, useEffect, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, endOfDay, parseISO } from 'date-fns';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Package,
  CheckCircle,
  Info,
  Wallet,
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });

  // 🔒 BLINDAGEM E REATIVIDADE
  const safeSales = useMemo(() => Array.isArray(sales) ? sales : [], [sales]);
  const safeProducts = useMemo(() => Array.isArray(products) ? products : [], [products]);
  const safeCashRegisters = useMemo(() => Array.isArray(cashRegisters) ? cashRegisters : [], [cashRegisters]);

  // 📅 FILTRO DE VENDAS (Sincronizado com o período selecionado)
  const filteredSales = useMemo(() => {
    if (!dateRange?.from) return [];
    const fromDate = startOfToday();
    const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    return safeSales.filter((sale) => {
      const saleDate = parseISO(sale.created_at);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [safeSales, dateRange]);

  // 📊 KPIs PRINCIPAIS
  const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total_cents, 0), [filteredSales]);
  const totalSalesCount = filteredSales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // 💰 LÓGICA DE CAIXA (Sincronizada com o PDV)
  const openCashRegister = useMemo(() => safeCashRegisters.find(cr => cr.closed_at === null), [safeCashRegisters]);
  
  const salesInOpenSession = useMemo(() => {
    if (!openCashRegister) return { total: 0, cash: 0 };
    const fromDate = parseISO(openCashRegister.opened_at);
    
    return safeSales.filter(s => parseISO(s.created_at) >= fromDate).reduce((acc, s) => {
      acc.total += s.total_cents;
      if (s.payment_method === 'cash') acc.cash += s.total_cents;
      return acc;
    }, { total: 0, cash: 0 });
  }, [safeSales, openCashRegister]);

  const currentCashInDrawer = openCashRegister 
    ? openCashRegister.opening_amount_cents + salesInOpenSession.cash 
    : 0;

  // 🧱 ESTADOS DE BLOQUEIO / CARREGAMENTO
  if (!user) return <div className="p-6">Validando sessão...</div>;
  if (storeStatus === 'loading_auth' || storeStatus === 'loading_store') return <div className="p-6">Sincronizando loja...</div>;
  if (storeStatus === 'no_store') return <div className="p-6">Nenhuma loja configurada.</div>;

  return (
    <>
      <PageHeader title="Dashboard">
        <DateRangePicker
          date={dateRange}
          onDateChange={setDateRange}
        />
      </PageHeader>

      <div className="space-y-6">
        {/* KPIs Superior */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Faturamento (Período)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{totalSalesCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{formatCurrency(averageTicket)}</div>
            </CardContent>
          </Card>

          <Card className={openCashRegister ? "border-green-500/50 bg-green-50/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Caixa Aberto</CardTitle>
              <Wallet className={cn("h-4 w-4", openCashRegister ? "text-green-500" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent>
              {openCashRegister ? (
                <div className="space-y-1">
                  <div className="text-2xl font-black text-green-600">{formatCurrency(currentCashInDrawer)}</div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo em Dinheiro</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="text-xl font-bold text-muted-foreground">Fechado</div>
                  <Button variant="link" className="h-auto p-0 text-[10px] uppercase font-bold" onClick={() => router.push('/cash')}>
                    Abrir Caixa Agora
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GRÁFICOS */}
        <div className="grid gap-6 md:grid-cols-2">
          <SalesByPaymentMethodChart
            data={filteredSales.reduce((acc, s) => {
              const existing = acc.find(item => item.name === s.payment_method);
              if (existing) existing.value += s.total_cents;
              else acc.push({ name: s.payment_method as any, value: s.total_cents });
              return acc;
            }, [] as { name: 'cash' | 'pix' | 'card', value: number }[])}
          />
          <SalesByProductChart 
            data={Object.entries(filteredSales.flatMap(s => s.items || []).reduce((acc, item) => {
              acc[item.product_name_snapshot] = (acc[item.product_name_snapshot] || 0) + item.subtotal_cents;
              return acc;
            }, {} as Record<string, number>))
            .map(([name, total]) => ({ name, total }))
            .sort((a,b) => b.total - a.total)} 
          />
        </div>
      </div>
    </>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
