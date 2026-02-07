
'use client';

/**
 * @fileOverview Visão Geral do Dashboard (Home) v6.0.
 * Sincronizado com o estado global de caixa e vendas.
 */

import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfDay, addDays, startOfToday, endOfDay, parseISO } from 'date-fns';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Wallet, 
  Target, 
  Users,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  SalesByPaymentMethodChart, 
  SalesByProductChart 
} from '@/components/charts';
import { useAuth } from '@/components/auth-provider';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function DashboardOverviewPage() {
  const { store, storeStatus, products, sales, cashSessions, customers } = useAuth();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });

  // 🔥 Fonte da Verdade: Sessão de Caixa
  const cashSessionsSafe = useMemo(() => Array.isArray(cashSessions) ? cashSessions : [], [cashSessions]);
  const openSession = useMemo(() => cashSessionsSafe.find(s => s.status === 'open'), [cashSessionsSafe]);

  const filteredSales = useMemo(() => {
    const safeSales = Array.isArray(sales) ? sales : [];
    if (!dateRange?.from) return [];
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    return safeSales.filter((sale) => {
      if (!sale?.created_at) return false;
      const saleDate = parseISO(sale.created_at);
      return saleDate >= from && saleDate <= to;
    });
  }, [sales, dateRange]);

  const stats = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    const revenue = filteredSales.reduce((sum, s) => sum + (s?.total_cents || 0), 0);
    
    const cost = filteredSales.flatMap(s => s?.items || []).reduce((acc, item) => {
      const prod = safeProducts.find(p => p.id === item.product_id);
      return acc + ((prod?.cost_cents || 0) * (item.quantity || 0));
    }, 0);
    
    const profit = revenue - cost;
    const cmvPercent = revenue > 0 ? (cost / revenue) * 100 : 0;
    
    return { revenue, cost, profit, cmvPercent };
  }, [filteredSales, products]);

  if (storeStatus === 'loading_auth' || storeStatus === 'loading_status') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="animate-pulse font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sincronizando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Painel de Gestão">
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        {!openSession ? (
          <Card className="border-red-500/50 bg-red-50/5 shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <Wallet className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Atenção: Turno de Caixa Fechado</p>
                <p className="text-xs text-red-700">Inicie um novo turno para registrar vendas físicas.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => router.push('/cash')} className="h-8 font-black uppercase text-[10px]">Abrir Caixa</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-500/50 bg-green-50/5 shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-green-900">Operação em Andamento</p>
                <p className="text-xs text-green-700">Caixa aberto hoje às {format(parseISO(openSession.opened_at), 'HH:mm')}.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/cash')} className="h-8 font-black uppercase text-[10px]">Ver Caixa</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats.revenue)}</div>
            <div className="flex items-center text-[10px] text-green-600 font-bold mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" /> Período selecionado
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">CMV %</CardTitle>
            <Target className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-destructive">{stats.cmvPercent.toFixed(1)}%</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">Custo Médio de Mercadoria</p>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase opacity-80">Lucro Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats.profit)}</div>
            <p className="text-[10px] font-bold opacity-70 mt-1">Sobra após custos</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Clientes</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{(customers || []).length}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">Cadastrados na base</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SalesByPaymentMethodChart 
          data={filteredSales.reduce((acc, s) => {
            const existing = acc.find(i => i.name === (s.payment_method || 'cash'));
            if (existing) existing.value += (s.total_cents || 0);
            else acc.push({ name: (s.payment_method as any) || 'cash', value: (s.total_cents || 0) });
            return acc;
          }, [] as { name: 'cash' | 'pix' | 'card', value: number }[])} 
        />
        <SalesByProductChart 
          data={Object.entries(filteredSales.flatMap(s => s.items || []).reduce((acc, i) => {
            acc[i.product_name_snapshot] = (acc[i.product_name_snapshot] || 0) + (i.subtotal_cents || 0);
            return acc;
          }, {} as Record<string, number>))
          .map(([name, total]) => ({ name, total }))
          .sort((a,b) => b.total - a.total)} 
        />
      </div>
    </div>
  );
}
