'use client';

/**
 * @fileOverview Página de Análise de CMV (Custo de Mercadoria Vendida)
 * 
 * Premissa: O custo vem estritamente de product.cost_cents.
 * O frontend agrega esses dados para gerar visão de lucro bruto e eficiência.
 */

import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, PieChart, ArrowDownRight, Target } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, addDays, startOfToday, parseISO } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function CMVPage() {
  const { sales, products } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -29),
    to: new Date(),
  });

  const stats = useMemo(() => {
    if (!dateRange?.from) return { revenue: 0, cost: 0, categories: {} };

    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    let totalRevenue = 0;
    let totalCost = 0;
    const categoryStats: Record<string, { revenue: number; cost: number; qty: number }> = {};

    sales.forEach(sale => {
      const saleDate = parseISO(sale.created_at);
      if (saleDate >= from && saleDate <= to) {
        totalRevenue += sale.total_cents;

        sale.items?.forEach(item => {
          const product = products.find(p => p.id === item.product_id);
          const itemCost = (product?.cost_cents ?? 0) * item.quantity;
          totalCost += itemCost;

          const cat = product?.category || 'Geral';
          if (!categoryStats[cat]) categoryStats[cat] = { revenue: 0, cost: 0, qty: 0 };
          categoryStats[cat].revenue += item.subtotal_cents;
          categoryStats[cat].cost += itemCost;
          categoryStats[cat].qty += item.quantity;
        });
      }
    });

    return {
      revenue: totalRevenue,
      cost: totalCost,
      categories: categoryStats
    };
  }, [sales, products, dateRange]);

  const cmvPercent = stats.revenue > 0 ? (stats.cost / stats.revenue) * 100 : 0;
  const grossProfit = stats.revenue - stats.cost;
  const netMargin = stats.revenue > 0 ? (grossProfit / stats.revenue) * 100 : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Painel de CMV" subtitle="Análise profunda de lucratividade e custos operacionais.">
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats.revenue)}</div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CMV Total</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-destructive">{formatCurrency(stats.cost)}</div>
          </CardContent>
        </Card>

        <Card className={cmvPercent > 40 ? "border-red-500/50" : "border-green-500/20"}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CMV %</CardTitle>
            <PieChart className={`h-4 w-4 ${cmvPercent > 40 ? 'text-red-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${cmvPercent > 40 ? 'text-red-600' : 'text-green-600'}`}>
              {cmvPercent.toFixed(1)}%
            </div>
            <Progress value={cmvPercent} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-primary shadow-lg shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">Lucro Bruto</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{formatCurrency(grossProfit)}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">Margem: {netMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eficiência por Categoria</CardTitle>
          <CardDescription>O que traz volume e o que traz margem para sua loja.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs uppercase font-bold">Categoria</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Vendas</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Custo</TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold">CMV %</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats.categories).map(([name, data]) => {
                  const catCmv = data.revenue > 0 ? (data.cost / data.revenue) * 100 : 0;
                  return (
                    <TableRow key={name} className="hover:bg-muted/5">
                      <TableCell className="font-bold">{name}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(data.revenue)}</TableCell>
                      <TableCell className="text-right text-destructive text-xs">{formatCurrency(data.cost)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={catCmv > 40 ? 'destructive' : 'default'} className="text-[10px]">
                          {catCmv.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-green-600">
                        {formatCurrency(data.revenue - data.cost)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {Object.keys(stats.categories).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground text-sm">
                      Nenhum dado financeiro para o período.
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
