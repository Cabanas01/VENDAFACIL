'use client';

import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { Lightbulb, Loader2, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SalesByProductChart,
  SalesByPaymentMethodChart,
  SalesByCategoryChart,
  StockByCategoryChart,
  SalesOverTimeChart
} from '@/components/charts';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { summarizeFinancialReports } from '@/ai/flows/summarize-financial-reports';
import type { SummarizeFinancialReportsOutput } from '@/ai/flows/summarize-financial-reports';
import { useAuth } from '@/components/auth-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function ReportsPage() {
  const { toast } = useToast();
  const { products, sales } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -29),
    to: new Date(),
  });
  const [financialReportData, setFinancialReportData] = useState('');
  const [summary, setSummary] = useState<SummarizeFinancialReportsOutput | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Filtered data based on dateRange
  const filteredSales = useMemo(() => {
    if (!dateRange?.from) return [];
    const fromDate = startOfDay(dateRange.from);
    const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    
    return (sales || []).filter(sale => {
      if (!sale.created_at) return false;
      const saleDate = new Date(sale.created_at);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [sales, dateRange]);

  const reportData = useMemo(() => {
    if (filteredSales.length === 0) {
        return { totalCents: 0, count: 0, cash: 0, pix: 0, card: 0, cost: 0, profit: 0, margin: 0 };
    }

    const totals = filteredSales.reduce((acc, sale) => {
      acc.totalCents += (sale.total_cents || 0);
      acc.count += 1;
      if (sale.payment_method) {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + (sale.total_cents || 0);
      }
      return acc;
    }, { totalCents: 0, count: 0, cash: 0, pix: 0, card: 0 });

    const cost = filteredSales.flatMap(s => s.items || []).reduce((acc, item) => {
        const product = (products || []).find(p => p.id === item.product_id);
        return acc + (product?.cost_cents ?? 0) * (item.quantity || 0);
    }, 0);
    
    const profit = totals.totalCents - cost;
    const margin = totals.totalCents > 0 ? (profit / totals.totalCents) * 100 : 0;

    return { ...totals, cost, profit, margin };
  }, [filteredSales, products]);
  
  // Sales over time data
  const salesOverTime = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    
    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
      const salesOnDay = filteredSales.filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
      return {
          date: format(day, 'dd/MM'),
          total: salesOnDay.reduce((sum, s) => sum + (s.total_cents || 0), 0)
      }
    });
  }, [filteredSales, dateRange]);

  const salesByPaymentMethod = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      if (sale.payment_method) {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + (sale.total_cents || 0);
      }
      return acc;
    }, {} as Record<'cash' | 'pix' | 'card', number>);
  }, [filteredSales]);

  const salesByProduct = useMemo(() => {
    return filteredSales
      .flatMap(sale => sale.items || [])
      .reduce((acc, item) => {
          const name = item.product_name_snapshot || 'Produto sem nome';
          acc[name] = (acc[name] || 0) + (item.subtotal_cents || 0);
          return acc;
      }, {} as Record<string, number>);
  }, [filteredSales]);

  const topProducts = useMemo(() => {
    return Object.entries(salesByProduct)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }));
  }, [salesByProduct]);

  const salesByCategory = useMemo(() => {
    return filteredSales
      .flatMap(sale => sale.items || [])
      .map(item => {
          const product = (products || []).find(p => p.id === item.product_id);
          return { ...item, category: product?.category || 'Sem categoria' };
      })
      .reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + (item.quantity || 0);
          return acc;
      }, {} as Record<string, number>);
  }, [filteredSales, products]);

  const topCategories = useMemo(() => {
    return Object.entries(salesByCategory)
      .sort((a,b) => b[1] - a[1])
      .map(([name, total]) => ({name, total}));
  }, [salesByCategory]);

  const stockByCategory = useMemo(() => {
    return (products || []).reduce((acc, product) => {
      const category = product.category || 'Sem categoria';
      acc[category] = (acc[category] || 0) + (product.stock_qty || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [products]);

  const stockByCategoryData = useMemo(() => {
    return Object.entries(stockByCategory).map(([name, total]) => ({ name, total }));
  }, [stockByCategory]);

  const productsWithoutSale = useMemo(() => {
    return (products || []).filter(p => (p.stock_qty || 0) > 0 && !filteredSales.some(s => (s.items || []).some(i => i.product_id === p.id)));
  }, [products, filteredSales]);

  const handleGenerateReportText = () => {
    if (!dateRange?.from || !reportData) {
        toast({
            variant: 'destructive',
            title: 'Sem dados',
            description: 'Selecione um período com dados para gerar o relatório.'
        });
        return;
    };

    const header = `Relatório do Período: ${format(dateRange.from, 'dd/MM/yyyy')} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : format(dateRange.from, 'dd/MM/yyyy')}\n\n`;
    
    const summaryData = `VISÃO GERAL\n` +
      `- Faturamento Total: ${formatCurrency(reportData.totalCents)}\n` +
      `- Lucro Estimado: ${formatCurrency(reportData.profit)}\n` +
      `- Margem Média: ${reportData.margin.toFixed(1)}%\n` +
      `- Total de Vendas: ${reportData.count}\n\n`;

    const topProductsText = 'TOP 5 PRODUTOS (POR FATURAMENTO)\n' +
      topProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p.name}: ${formatCurrency(p.total)}`).join('\n') + '\n\n';

    const topCategoriesText = 'TOP 5 CATEGORIAS (POR QUANTIDADE VENDIDA)\n' +
        topCategories.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: ${c.total} unidades`).join('\n') + '\n\n';
    
    const payment = 'FATURAMENTO POR PAGAMENTO\n' +
        Object.entries(salesByPaymentMethod).map(([method, total]) => {
            const methodName = method === 'cash' ? 'Dinheiro' : method === 'pix' ? 'Pix' : 'Cartão';
            return `- ${methodName}: ${formatCurrency(total as number)}`;
        }).join('\n') + '\n\n';
    
    const generatedText = header + summaryData + topProductsText + topCategoriesText + payment;
    setFinancialReportData(generatedText);
    toast({ title: 'Dados gerados!', description: 'Agora você pode analisar os dados com a IA.' });
  }
  
  const handleSummarize = async () => {
    if (!financialReportData.trim()) {
      toast({ variant: 'destructive', title: 'Dados insuficientes', description: "Clique em 'Gerar dados do período' primeiro." });
      return;
    }
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeFinancialReports({ financialReportData });
      setSummary(result);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao analisar', description: 'Não foi possível gerar o resumo. Tente novamente.' });
    } finally {
      setIsSummarizing(false);
    }
  };


  return (
    <>
      <PageHeader title="Relatórios" subtitle="Visão gerencial completa do seu negócio.">
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </PageHeader>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="text-yellow-400" />Análise Inteligente de Relatório</CardTitle>
            <CardDescription>Gere um resumo dos dados do período selecionado e use nossa IA para obter insights, tendências, oportunidades e riscos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleGenerateReportText}>
                        Gerar dados do período
                    </Button>
                </div>
                <Textarea
                placeholder="Clique em 'Gerar dados do período' para carregar as informações ou cole aqui os dados de outro relatório..."
                className="min-h-32 font-code"
                value={financialReportData}
                onChange={(e) => setFinancialReportData(e.target.value)}
                />
            </div>
            <Button onClick={handleSummarize} disabled={isSummarizing}>
              {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analisar com IA
            </Button>
            {isSummarizing && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Analisando dados...</p>
              </div>
            )}
            {summary && (
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <Card>
                  <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{summary.summary}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Tendências</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{summary.trends}</p></CardContent>
                </Card>
                <Card className="border-green-300 dark:border-green-800">
                  <CardHeader><CardTitle className="text-green-600">Oportunidades</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{summary.opportunities}</p></CardContent>
                </Card>
                <Card className="border-red-300 dark:border-red-800">
                  <CardHeader><CardTitle className="text-red-600">Riscos</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{summary.risks}</p></CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-6">
            <h3 className="text-2xl font-headline font-bold">Financeiro</h3>
            <SalesOverTimeChart data={salesOverTime} />
            <div className="grid md:grid-cols-2 gap-6">
                 <SalesByPaymentMethodChart data={Object.entries(salesByPaymentMethod).map(([name, value]) => ({ name: name as 'cash' | 'pix' | 'card', value }))} />
            </div>
        </div>

        <div className="space-y-6">
            <h3 className="text-2xl font-headline font-bold">Produtos e Categorias</h3>
             <div className="grid md:grid-cols-2 gap-6">
                <SalesByProductChart data={topProducts} />
                <SalesByCategoryChart data={topCategories} />
             </div>
        </div>
        
        <div className="space-y-6">
            <h3 className="text-2xl font-headline font-bold">Estoque</h3>
             <div className="grid md:grid-cols-2 gap-6">
                <StockByCategoryChart data={stockByCategoryData} />
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingDown /> Produtos sem venda</CardTitle>
                        <CardDescription>Produtos com estoque que não foram vendidos no período.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {productsWithoutSale.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead>Categoria</TableHead>
                                            <TableHead className="text-right">Estoque</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productsWithoutSale.map(p => (
                                            <TableRow key={p.id} onClick={() => router.push('/dashboard/products')} className="cursor-pointer">
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell>{p.category || '-'}</TableCell>
                                                <TableCell className="text-right">{p.stock_qty}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Todos os produtos com estoque tiveram vendas no período.</p>
                        )}
                    </CardContent>
                </Card>
             </div>
        </div>
      </div>
    </>
  );
}
