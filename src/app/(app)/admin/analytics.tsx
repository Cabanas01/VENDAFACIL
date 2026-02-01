'use client';

/**
 * @fileOverview Painel de Analytics Admin (RPC & TABLE DATA)
 * 
 * Consome analytics_events via RPC e trata estados de erro/vazio de forma resiliente.
 */

import { useEffect, useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, format, parseISO, startOfDay, endOfDay } from 'date-fns';
import {
  Activity,
  Eye,
  MousePointerClick,
  FileText,
  TrendingUp,
  Search
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import type { AnalyticsSummary } from '@/lib/types';
import { SalesOverTimeChart } from '@/components/charts';

export default function AdminAnalytics() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [storeIdFilter, setStoreIdFilter] = useState(searchParams.get('store_id') || '');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const fromDate = startOfDay(dateRange?.from || addDays(startOfToday(), -6)).toISOString();
        const toDate = endOfDay(dateRange?.to || dateRange?.from || new Date()).toISOString();

        const { data, error } = await supabase.rpc('get_analytics_summary', {
          p_store_id: storeIdFilter || null,
          p_start: fromDate,
          p_end: toDate,
        });

        if (error) throw error;
        setSummary(data as AnalyticsSummary);
      } catch (err: any) {
        console.error('[ANALYTICS_RPC_ERROR]', err);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [storeIdFilter, dateRange, toast]);
  
  const chartData = useMemo(() => {
    if (!summary?.events_by_day || !Array.isArray(summary.events_by_day)) return [];
    return summary.events_by_day.map(d => ({
        date: format(parseISO(d.day), 'dd/MM'),
        total: d.count || 0
    }));
  }, [summary]);

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="ID da Loja (UUID)..."
                    value={storeIdFilter}
                    onChange={(e) => setStoreIdFilter(e.target.value)}
                    className="pl-10 font-mono text-xs h-11"
                />
            </div>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>

        {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
            </div>
        ) : !summary || summary.total_events === 0 ? (
            <Card className="border-dashed py-24 text-center text-muted-foreground bg-muted/5">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase text-[10px] tracking-[0.2em]">Nenhum tráfego registrado no período</p>
            </Card>
        ) : (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Eventos Totais" value={summary.total_events} icon={<Activity />} />
                <MetricCard title="Views de Perfil" value={summary.total_profile_views} icon={<Eye />} />
                <MetricCard title="Cliques Únicos" value={summary.total_unique_clicks} icon={<MousePointerClick />} />
                <MetricCard title="Relatórios Abertos" value={summary.total_reports_opened} icon={<FileText />} />
            </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 border-none shadow-sm">
                <CardHeader className="bg-muted/10 border-b"><CardTitle className="text-xs font-black uppercase tracking-widest">Top Ações</CardTitle></CardHeader>
                <CardContent className="pt-4">
                     {loading ? <Skeleton className="h-40 w-full" /> : (
                        <Table>
                            <TableBody>
                                {summary?.top_event_names?.map((event, i) => (
                                    <TableRow key={i} className="hover:bg-transparent">
                                        <TableCell className="font-bold text-[10px] uppercase text-muted-foreground">{event.event_name.replace(/_/g, ' ')}</TableCell>
                                        <TableCell className="text-right font-black text-primary">{event.count || 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     )}
                </CardContent>
            </Card>
            <Card className="md:col-span-2 border-none shadow-sm">
                <CardHeader className="bg-muted/10 border-b"><CardTitle className="text-xs font-black uppercase tracking-widest">Tráfego Diário</CardTitle></CardHeader>
                <CardContent className="pt-6">
                     {loading ? <Skeleton className="h-[300px] w-full" /> : <SalesOverTimeChart data={chartData} />}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: number | undefined, icon: any }) {
  return (
    <Card className="border-primary/5 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">{title}</CardTitle>
        <div className="h-4 w-4 text-primary opacity-50">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tracking-tighter">{(value ?? 0).toLocaleString('pt-BR')}</div>
      </CardContent>
    </Card>
  );
}