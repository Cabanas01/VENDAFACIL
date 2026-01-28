'use client';

import { useState, useEffect, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, format, parseISO } from 'date-fns';
import {
  LineChart,
  Wallet,
  Activity,
  Eye,
  MousePointerClick,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { useAnalytics } from '@/lib/analytics/track';
import type { AnalyticsSummary } from '@/lib/types';
import {
  SalesOverTimeChart
} from '@/components/charts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function UsersAnalyticsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { store } = useAuth();
  const { trackReportOpened, registerUniqueClick } = useAnalytics();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    trackReportOpened('users_analytics');
  }, [trackReportOpened]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!store || !dateRange?.from) return;
      setLoading(true);

      const fromDate = dateRange.from.toISOString();
      const toDate = (dateRange.to || dateRange.from).toISOString();

      const { data, error } = await supabase
        .rpc('get_analytics_summary', {
          p_store_id: store.id,
          p_from: fromDate,
          p_to: toDate,
        });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao buscar dados',
          description: error.message,
        });
        setSummary(null);
      } else {
        setSummary(data);
      }
      setLoading(false);
    };

    fetchAnalytics();
  }, [store, dateRange, toast]);
  
  const eventsOverTimeData = useMemo(() => {
    if (!summary?.events_by_day) return [];
    return summary.events_by_day.map(d => ({
        date: format(parseISO(d.day), 'dd/MM'),
        total: d.count
    }));
  }, [summary]);

  const handleGoToBilling = () => {
      registerUniqueClick('go_billing_from_analytics');
      router.push('/billing');
  }

  return (
    <>
      <PageHeader title="Usuários & Eventos" subtitle="Analise o comportamento e a atividade na sua loja.">
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </PageHeader>
      
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="manage" disabled>Gerenciar Usuários (em breve)</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="space-y-6">
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                </div>
            ) : (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.total_events ?? 0}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Visitas a Perfis</CardTitle>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.total_profile_views ?? 0}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cliques Únicos</CardTitle>
                            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.total_unique_clicks ?? 0}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Relatórios Abertos</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.total_reports_opened ?? 0}</div>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Eventos</CardTitle>
                        <CardDescription>Os eventos mais comuns registrados no período selecionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loading ? <Skeleton className="h-40 w-full" /> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Evento</TableHead>
                                        <TableHead className="text-right">Quantidade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary?.top_event_names?.map(event => (
                                        <TableRow key={event.event_name}>
                                            <TableCell className="font-medium">{event.event_name}</TableCell>
                                            <TableCell className="text-right">{event.count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Ações Rápidas</CardTitle>
                        <CardDescription>Teste eventos ou navegue para outras áreas.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button onClick={handleGoToBilling} variant="outline">
                            <Wallet className="mr-2" />
                            Ir para Assinaturas (Testar Clique Único)
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <div>
                 {loading ? <Skeleton className="h-80 w-full" /> : (
                    <SalesOverTimeChart data={eventsOverTimeData} />
                 )}
            </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
