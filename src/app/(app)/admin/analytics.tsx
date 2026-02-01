'use client';

/**
 * @fileOverview Painel de Analytics (Admin) - Seguro e Defensivo
 * 
 * Implementa agregação no frontend e proteção contra hidratação.
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
import { SalesOverTimeChart } from '@/components/charts';

export default function AdminAnalytics() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [storeIdFilter, setStoreIdFilter] = useState(searchParams.get('store_id') || '');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchRawEvents = async () => {
      setLoading(true);
      try {
        const from = startOfDay(dateRange?.from || addDays(startOfToday(), -6)).toISOString();
        const to = endOfDay(dateRange?.to || dateRange?.from || new Date()).toISOString();

        let query = supabase
          .from('analytics_events')
          .select('*')
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true });

        if (storeIdFilter) {
          query = query.eq('store_id', storeIdFilter);
        }

        const { data, error } = await query;
        if (error) throw error;
        setEvents(data || []);
      } catch (err: any) {
        console.error('[ADMIN_ANALYTICS_ERROR]', err);
        toast({ variant: 'destructive', title: 'Erro ao buscar eventos', description: err.message });
      } finally {
        setLoading(false);
      }
    };

    if (isMounted) fetchRawEvents();
  }, [storeIdFilter, dateRange, toast, isMounted]);

  // Agregações Defensivas
  const metrics = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    return safeEvents.reduce((acc, ev) => {
      if (!ev) return acc;
      acc.total += 1;
      if (ev.event_name === 'page_view') acc.views += 1;
      if (ev.event_name === 'report_opened' || ev.event_name === 'report_viewed') acc.reports += 1;
      
      const createdAt = ev.created_at || new Date().toISOString();
      const day = format(new Date(createdAt), 'yyyy-MM-dd');
      acc.byDay[day] = (acc.byDay[day] || 0) + 1;

      const name = ev.event_name || 'unknown';
      acc.topEvents[name] = (acc.topEvents[name] || 0) + 1;

      return acc;
    }, { 
      total: 0, 
      views: 0, 
      reports: 0, 
      byDay: {} as Record<string, number>,
      topEvents: {} as Record<string, number>
    });
  }, [events]);

  const chartData = useMemo(() => {
    return Object.entries(metrics.byDay).map(([day, count]) => ({
      date: format(parseISO(day), 'dd/MM'),
      total: count
    }));
  }, [metrics.byDay]);

  const sortedTopEvents = useMemo(() => {
    return Object.entries(metrics.topEvents)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [metrics.topEvents]);

  if (!isMounted) return <div className="py-20 text-center animate-pulse">Iniciando análise de dados...</div>;

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filtrar por ID da Loja..."
                    value={storeIdFilter}
                    onChange={(e) => setStoreIdFilter(e.target.value)}
                    className="pl-10 h-11 font-mono text-[10px]"
                />
            </div>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>

        {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
            </div>
        ) : events.length === 0 ? (
            <Card className="border-dashed py-24 text-center bg-muted/5">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sem atividade no período selecionado</p>
            </Card>
        ) : (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Eventos Totais" value={metrics.total} icon={<Activity />} />
                <MetricCard title="Page Views" value={metrics.views} icon={<Eye />} />
                <MetricCard title="Relatórios" value={metrics.reports} icon={<FileText />} />
                <MetricCard title="Ações Ativas" value={metrics.total - metrics.views} icon={<MousePointerClick />} />
            </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 border-none shadow-sm">
                <CardHeader className="bg-muted/10 border-b"><CardTitle className="text-[10px] font-black uppercase tracking-widest">Top Ações</CardTitle></CardHeader>
                <CardContent className="pt-4">
                     <Table>
                        <TableBody>
                            {sortedTopEvents.map(([name, count]) => (
                                <TableRow key={name} className="hover:bg-transparent border-none">
                                    <TableCell className="font-bold text-[10px] uppercase text-muted-foreground py-2">{name.replace(/_/g, ' ')}</TableCell>
                                    <TableCell className="text-right font-black text-primary py-2">{count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="md:col-span-2 border-none shadow-sm">
                <CardHeader className="bg-muted/10 border-b"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Volume de Eventos / Dia</CardTitle></CardHeader>
                <CardContent className="pt-6">
                     <SalesOverTimeChart data={chartData} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: any, icon: any }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <Card className="border-primary/5 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">{title}</CardTitle>
        <div className="h-4 w-4 text-primary opacity-50">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tracking-tighter">{displayValue ?? 0}</div>
      </CardContent>
    </Card>
  );
}
