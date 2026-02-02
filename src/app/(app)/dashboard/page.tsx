'use client';

/**
 * @fileOverview Visão Geral do Dashboard (Home)
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
  ChefHat,
  GlassWater,
  ClipboardList
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
  const { store, storeStatus, products, sales, cashRegisters, customers } = useAuth();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });

  const filteredSales = useMemo(() => {
    const safeSales = Array.isArray(sales) ? sales : [];
    if (!dateRange?.from) return [];
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    return safeSales.filter((sale) => {
      if (!sale?.created_at) return false;
      try {
        const saleDate = parseISO(sale.created_at);
        return saleDate >= from && saleDate <= to;
      } catch {
        return false;
      }
    });
  }, [sales, dateRange]);

  const stats = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    const revenue = filteredSales.reduce((sum, s) => sum + (s?.total_cents || 0), 0);
    
    const cost = filteredSales.flatMap(s => s?.items || []).reduce((acc, item) => {
      if (!item) return acc;
      const prod = safeProducts.find(p => p?.id === item.product_id);
      return acc + ((prod?.cost_cents || 0) * (item.quantity || 0));
    }, 0);
    
    const profit = revenue - cost;
    const cmvPercent = revenue > 0 ? (cost / revenue) * 100 : 0;
    
    return { revenue, cost, profit, cmvPercent };
  }, [filteredSales, products]);

  const openCash = useMemo(() => (Array.isArray(cashRegisters) ? cashRegisters : []).find(cr => cr && !cr.closed_at), [cashRegisters]);
  const lowStockCount = useMemo(() => (Array.isArray(products) ? products : []).filter(p => p && (p.stock_qty || 0) <= (p.min_stock_qty || 0)).length, [products]);

  if (storeStatus === 'loading_auth' || storeStatus === 'loading_status') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="animate-pulse font-medium text-sm text-[10px] uppercase tracking-widest">Sincronizando ambiente comercial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Visão Geral">
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </PageHeader>

      {/* Atalhos de Produção (Se Ativo) */}
      {store?.use_comanda && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-primary/10 bg-background hover:border-primary transition-all cursor-pointer shadow-sm group" onClick={() => router.push('/comandas')}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-foreground">Gerir Comandas</p>
                <p className="text-[10px] text-muted-foreground font-bold">Atendimento de mesas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/10 bg-background hover:border-orange-500 transition-all cursor-pointer shadow-sm group" onClick={() => router.push('/painel/cozinha')}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="h-10 w-10 rounded-full bg-orange-500/5 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors text-orange-600">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-foreground">Painel Cozinha</p>
                <p className="text-[10px] text-muted-foreground font-bold">Monitor de preparo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-cyan-500/10 bg-background hover:border-cyan-500 transition-all cursor-pointer shadow-sm group" onClick={() => router.push('/painel/bar')}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="h-10 w-10 rounded-full bg-cyan-500/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-colors text-cyan-600">
                <GlassWater className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-foreground">Painel Bar</p>
                <p className="text-[10px] text-muted-foreground font-bold">Monitor de bebidas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas Críticos */}
      <div className="grid gap-4 md:grid-cols-2">
        {lowStockCount > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-50/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-yellow-900">{lowStockCount} produtos com estoque crítico</p>
                <p className="text-xs text-yellow-700">Evite rupturas no seu faturamento.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/products')} className="h-8 font-black uppercase text-[10px]">Ver Lista</Button>
            </CardContent>
          </Card>
        )}
        {!openCash && (
          <Card className="border-red-500/50 bg-red-50/5">
            <CardContent className="flex items-center gap-4 py-4">
              <Wallet className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Seu caixa está fechado</p>
                <p className="text-xs text-red-700">Abra o turno para iniciar as vendas físicas.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => router.push('/cash')} className="h-8 font-black uppercase text-[10px]">Abrir Caixa</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* KPIs Financeiros */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats.revenue)}</div>
            <div className="flex items-center text-[10px] text-green-600 font-bold mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" /> No período
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
            <p className="text-[10px] text-muted-foreground font-bold mt-1">Custo das Mercadorias</p>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase opacity-80">Lucro Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats.profit)}</div>
            <p className="text-[10px] font-bold opacity-70 mt-1">Sobra após o custo</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Clientes</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{(Array.isArray(customers) ? customers : []).length}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">Ativos na base</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SalesByPaymentMethodChart 
          data={filteredSales.reduce((acc, s) => {
            if (!s?.payment_method) return acc;
            const existing = acc.find(i => i.name === s.payment_method);
            if (existing) existing.value += (s.total_cents || 0);
            else acc.push({ name: s.payment_method as any, value: (s.total_cents || 0) });
            return acc;
          }, [] as { name: 'cash' | 'pix' | 'card', value: number }[])} 
        />
        <SalesByProductChart 
          data={Object.entries(filteredSales.flatMap(s => s?.items || []).reduce((acc, i) => {
            if (!i) return acc;
            const name = i.product_name_snapshot || 'Produto';
            acc[name] = (acc[name] || 0) + (i.subtotal_cents || 0);
            return acc;
          }, {} as Record<string, number>))
          .map(([name, total]) => ({ name, total }))
          .sort((a,b) => b.total - a.total)} 
        />
      </div>
    </div>
  );
}