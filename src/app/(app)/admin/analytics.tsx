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
  TrendingUp,
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

const ADMIN_ANALYTICS_ENABLED = true;

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
      setLoading(true);

      const fromDate = dateRange?.from?.toISOString() || addDays(startOfToday(), -6).toISOString();
      const toDate = (dateRange?.to || dateRange?.from || new Date()).toISOString();

      const { data, error } = await supabase
        .rpc('get_analytics_summary', {
          p_store_id: storeIdFilter || null,
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
        setSummary(data as AnalyticsSummary);
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

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full max-w-sm">
                <Input 
                    placeholder="Filtrar por ID da Loja (opcional)..."
                    value={storeIdFilter}
                    onChange={(e) => setStoreIdFilter(e.target.value)}
                    className="pr-10 font-mono text-xs uppercase"
                />
                {storeIdFilter && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setStoreIdFilter('')}
                    >
                        &times;
                    </Button>
                )}
            </div>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>

        {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i}><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                ))}
            </div>
        ) : !summary ? (
            <Card>
                <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <TrendingUp className="h-10 w-10 opacity-20" />
                    <p>Nenhum dado de tráfego localizado para os filtros selecionados.</p>
                </CardContent>
            </Card>
        ) : (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total de Eventos</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tighter">{summary?.total_events ?? 0}</div>
                    </CardContent>
                </Card>
                 <Card className="border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Visitas a Perfis</CardTitle>
                        <Eye className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tighter">{summary?.total_profile_views ?? 0}</div>
                    </CardContent>
                </Card>
                 <Card className="border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cliques Únicos</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tighter">{summary?.total_unique_clicks ?? 0}</div>
                    </CardContent>
                </Card>
                 <Card className="border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Relatórios Gerados</CardTitle>
                        <FileText className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tighter">{summary?.total_reports_opened ?? 0}</div>
                    </CardContent>
                </Card>
            </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Top 5 Eventos</CardTitle>
                    <CardDescription>Eventos mais frequentes no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading || !summary ? <Skeleton className="h-40 w-full" /> : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="text-[10px] uppercase font-black">Evento</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase font-black">Qtd</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary?.top_event_names?.map((event, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-bold text-xs uppercase">{event.event_name.replace(/_/g, ' ')}</TableCell>
                                            <TableCell className="text-right font-black text-primary">{event.count}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(!summary?.top_event_names || summary.top_event_names.length === 0) && (
                                        <TableRow><TableCell colSpan={2} className="text-center py-4 text-xs">Sem dados</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                     )}
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Tráfego por Período</CardTitle>
                    <CardDescription>Volume de interação diária no SaaS.</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading || !summary ? <Skeleton className="h-[300px] w-full" /> : (
                        <SalesOverTimeChart data={eventsOverTimeData} />
                     )}
                </CardContent>
            </Card>
        </div>

         <Card className="bg-primary/5 border-primary/10">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Simulação de Rastreio</CardTitle>
                <CardDescription>Teste o envio de eventos únicos para o sistema de analytics.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <Button onClick={handleGoToBilling} variant="outline" className="w-fit font-bold gap-2">
                    <Wallet className="h-4 w-4" />
                    Testar Clique Único (Ir para Planos)
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
