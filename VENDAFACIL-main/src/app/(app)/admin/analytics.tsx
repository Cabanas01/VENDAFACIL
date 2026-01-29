'use client';

import { useEffect, useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, format, parseISO } from 'date-fns';
import {
  Activity,
  Eye,
  MousePointerClick,
  FileText,
  Wallet,
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import type { AnalyticsSummary } from '@/lib/types';
import {
  SalesOverTimeChart
} from '@/components/charts';
import { Input } from '@/components/ui/input';
import { useAnalytics } from '@/lib/analytics/track';

const ADMIN_ANALYTICS_ENABLED = false;

export default function AdminAnalytics() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { registerUniqueClick } = useAnalytics();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  const [storeIdFilter, setStoreIdFilter] = useState(searchParams.get('store_id') || '');

  useEffect(() => {
    if (!ADMIN_ANALYTICS_ENABLED) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      if (!storeIdFilter || !dateRange?.from) {
          setSummary(null);
          setLoading(false);
          return;
      };
      setLoading(true);

      const fromDate = dateRange.from.toISOString();
      const toDate = (dateRange.to || dateRange.from).toISOString();

      const { data, error } = await supabase
        .rpc('get_analytics_summary', {
          p_store_id: storeIdFilter,
          p_from: fromDate,
          p_to: toDate,
        });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao buscar dados de analytics',
          description: error.message,
        });
        setSummary(null);
      } else {
        setSummary(data);
      }
      setLoading(false);
    };

    fetchAnalytics();
  }, [storeIdFilter, dateRange, toast]);
  
  const eventsOverTimeData = useMemo(() => {
    if (!summary?.events_by_day) return [];
    return summary.events_by_day.map(d => ({
        date: format(parseISO(d.day), 'dd/MM'),
        total: d.count
    }));
  }, [summary]);

  const handleGoToBilling = () => {
      registerUniqueClick('go_billing_from_admin_analytics');
      router.push('/billing');
  }

  if (!ADMIN_ANALYTICS_ENABLED) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Análise de Tráfego</CardTitle>
                    <CardDescription>
                        Esta funcionalidade está em desenvolvimento. Para habilitá-la, altere a flag `ADMIN_ANALYTICS_ENABLED` no código.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground p-8">
                    <p>Funcionalidade em breve.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Ações Rápidas de Analytics</CardTitle>
                    <CardDescription>Use estes botões para disparar eventos de teste.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button onClick={handleGoToBilling} variant="outline">
                        <Wallet className="mr-2" />
                        Ir para Assinaturas (Testar Clique Único)
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-end">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Filtro de Loja</CardTitle>
                <CardDescription>Insira o ID da loja para visualizar os dados de analytics.</CardDescription>
            </CardHeader>
            <CardContent>
                <Input 
                    placeholder="Cole o ID da loja aqui..."
                    value={storeIdFilter}
                    onChange={(e) => setStoreIdFilter(e.target.value)}
                />
            </CardContent>
        </Card>

        {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
            </div>
        ) : !summary ? (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    Nenhum dado de analytics para a loja e período selecionados.
                </CardContent>
            </Card>
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
                     {loading || !summary ? <Skeleton className="h-40 w-full" /> : (
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
                    <CardTitle>Eventos por dia</CardTitle>
                </CardHeader>
                <CardContent>
                     {loading || !summary ? <Skeleton className="h-[300px] w-full" /> : (
                        <SalesOverTimeChart data={eventsOverTimeData} />
                     )}
                </CardContent>
            </Card>
        </div>

         <Card>
            <CardHeader>
                <CardTitle>Ações Rápidas de Analytics</CardTitle>
                <CardDescription>Use estes botões para disparar eventos de teste.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <Button onClick={handleGoToBilling} variant="outline">
                    <Wallet className="mr-2" />
                    Ir para Assinaturas (Testar Clique Único)
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
