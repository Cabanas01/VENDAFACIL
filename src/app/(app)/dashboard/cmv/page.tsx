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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, PieChart, ArrowDownRight } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, addDays, startOfToday } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function CMVPage() {
  const { sales, products } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -29),
    to: new Date(),
  });

  // Cálculo do CMV baseado no período selecionado
  const stats = useMemo(() => {
    if (!dateRange?.from) return { revenue: 0, cost: 0, categories: {} };

    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    let totalRevenue = 0;
    let totalCost = 0;
    const categoryStats: Record<string, { revenue: number; cost: number }> = {};

    sales.forEach(sale => {
      const saleDate = new Date(sale.created_at);
      if (saleDate >= from && saleDate <= to) {
        totalRevenue += sale.total_cents;

        sale.items?.forEach(item => {
          const product = products.find(p => p.id === item.product_id);
          const itemCost = (product?.cost_cents ?? 0) * item.quantity;
          totalCost += itemCost;

          const cat = product?.category || 'Geral';
          if (!categoryStats[cat]) categoryStats[cat] = { revenue: 0, cost: 0 };
          categoryStats[cat].revenue += item.subtotal_cents;
          categoryStats[cat].cost += itemCost;
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

  return (
    <div className="space-y-8">
      <PageHeader title="Gestão de CMV" subtitle="Análise de margem e custo de mercadoria vendida.">
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">CMV Total (R$)</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.cost)}</div>
            <p className="text-xs text-muted-foreground mt-1">Custo das mercadorias saídas</p>
          </CardContent>
        </Card>

        <Card className={cmvPercent > 40 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">CMV %</CardTitle>
            <PieChart className={`h-4 w-4 ${cmvPercent > 40 ? 'text-destructive' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cmvPercent > 40 ? 'text-destructive' : ''}`}>
              {cmvPercent.toFixed(1)}%
            </div>
            <Progress value={cmvPercent} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(grossProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sobra após custos diretos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Vendas (R$)</TableHead>
                <TableHead className="text-right">Custo (R$)</TableHead>
                <TableHead className="text-right">CMV %</TableHead>
                <TableHead className="text-right">Lucro Bruto (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(stats.categories).map(([name, data]) => {
                const catCmv = data.revenue > 0 ? (data.cost / data.revenue) * 100 : 0;
                return (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(data.cost)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${catCmv > 40 ? 'text-destructive' : 'text-green-600'}`}>
                        {catCmv.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(data.revenue - data.cost)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {Object.keys(stats.categories).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhuma venda registrada no período para cálculo de CMV.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
