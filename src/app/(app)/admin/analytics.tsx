'use client';

/**
 * @fileOverview Painel de Analytics (Admin) - Versão SaaS Supervisor
 * 
 * Implementa monitoramento em tempo real e funil de conversão.
 */

import { useEffect, useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, format, parseISO, startOfDay, endOfDay, subMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  Eye,
  Users,
  MousePointerClick,
  FileText,
  TrendingUp,
  Search,
  Globe,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { SalesOverTimeChart } from '@/components/charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminAnalytics() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [storeIdFilter, setStoreIdFilter] = useState(searchParams.get('store_id') || '');
  const [realtimeCount, setRealtimeCount] = useState(0);

  const fetchEvents = async () => {
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

      // Realtime: Ativos nos últimos 30 min
      const thirtyMinsAgo = subMinutes(new Date(), 30).toISOString();
      const { count } = await supabase
        .from('analytics_events')
        .select('session_id', { count: 'exact', head: true })
        .gte('created_at', thirtyMinsAgo);
      
      setRealtimeCount(count || 0);

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro Analytics', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Refresh a cada 30s
    return () => clearInterval(interval);
  }, [storeIdFilter, dateRange]);

  // Agregações no Frontend
  const metrics = useMemo(() => {
    const safe = Array.isArray(events) ? events : [];
    
    const stats = safe.reduce((acc, ev) => {
      acc.total += 1;
      if (ev.event_name === 'page_view') acc.views += 1;
      
      // Funil
      if (ev.event_name === 'login_view') acc.funnel.login_v += 1;
      if (ev.event_name === 'login_success') acc.funnel.login_s += 1;
      if (ev.event_name === 'signup_view') acc.funnel.signup_v += 1;
      if (ev.event_name === 'signup_success') acc.funnel.signup_s += 1;

      // Origens
      const source = ev.metadata?.source || 'direto';
      const medium = ev.metadata?.medium || 'nenhum';
      const key = `${source} / ${medium}`;
      acc.sources[key] = (acc.sources[key] || 0) + 1;

      // Por dia
      const day = format(new Date(ev.created_at), 'yyyy-MM-dd');
      acc.byDay[day] = (acc.byDay[day] || 0) + 1;

      return acc;
    }, { 
      total: 0, 
      views: 0, 
      funnel: { login_v: 0, login_s: 0, signup_v: 0, signup_s: 0 },
      sources: {} as Record<string, number>,
      byDay: {} as Record<string, number>
    });

    return stats;
  }, [events]);

  const chartData = useMemo(() => {
    return Object.entries(metrics.byDay).map(([date, count]) => ({
      date: format(parseISO(date), 'dd/MM'),
      total: count
    }));
  }, [metrics.byDay]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background p-4 rounded-xl border border-primary/5 shadow-sm">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filtrar por ID de Loja..."
                    value={storeIdFilter}
                    onChange={(e) => setStoreIdFilter(e.target.value)}
                    className="pl-10 h-11"
                />
            </div>
            <div className="flex items-center gap-3">
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Button variant="ghost" size="icon" onClick={fetchEvents} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
              title="Ativos agora (30m)" 
              value={realtimeCount} 
              icon={<Users className="text-green-500" />} 
              subtitle="Usuários online no sistema"
              isLive
            />
            <MetricCard 
              title="Eventos Totais" 
              value={metrics.total} 
              icon={<Activity className="text-primary" />} 
              subtitle="Ações registradas no período"
            />
            <MetricCard 
              title="Visualizações" 
              value={metrics.views} 
              icon={<Eye className="text-blue-500" />} 
              subtitle="Total de trocas de página"
            />
            <MetricCard 
              title="Conversões" 
              value={metrics.funnel.signup_s} 
              icon={<TrendingUp className="text-orange-500" />} 
              subtitle="Novos cadastros realizados"
            />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Volume de Tráfego</CardTitle>
                    <CardDescription>Distribuição de eventos por dia no período selecionado.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                     <SalesOverTimeChart data={chartData} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Funil de Acesso</CardTitle>
                    <CardDescription>Eficiência das páginas de entrada.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <FunnelItem label="Viram Login" value={metrics.funnel.login_v} color="bg-blue-500" />
                        <FunnelItem label="Logaram" value={metrics.funnel.login_s} color="bg-green-500" parentValue={metrics.funnel.login_v} />
                        <div className="border-t pt-4" />
                        <FunnelItem label="Viram Signup" value={metrics.funnel.signup_v} color="bg-orange-500" />
                        <FunnelItem label="Cadastraram" value={metrics.funnel.signup_s} color="bg-green-500" parentValue={metrics.funnel.signup_v} />
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Origem do Tráfego (UTMs)
                  </CardTitle>
                  <CardDescription>Canais que mais trouxeram eventos ao sistema.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold">Canais (Source / Medium)</TableHead>
                            <TableHead className="text-right font-bold">Eventos</TableHead>
                            <TableHead className="text-right font-bold">% Part.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(metrics.sources)
                          .sort((a,b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([source, count]) => (
                            <TableRow key={source}>
                                <TableCell className="font-medium capitalize">{source}</TableCell>
                                <TableCell className="text-right font-black">{count}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">
                                  {((count / metrics.total) * 100).toFixed(1)}%
                                </TableCell>
                            </TableRow>
                        ))}
                        {Object.keys(metrics.sources).length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Sem dados de origem.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}

function MetricCard({ title, value, icon, subtitle, isLive = false }: any) {
  return (
    <Card className="relative overflow-hidden border-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{title}</CardTitle>
        <div className="h-4 w-4 opacity-80">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tighter">{value.toLocaleString()}</div>
        <p className="text-[10px] text-muted-foreground mt-1 font-bold">{subtitle}</p>
        {isLive && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] font-black uppercase text-green-600 tracking-tighter">Live</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelItem({ label, value, color, parentValue }: any) {
  const percent = parentValue && parentValue > 0 ? (value / parentValue) * 100 : 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-tight">
        <span>{label}</span>
        <span className="text-primary">{value}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percent}%` }} />
      </div>
      {parentValue && (
        <p className="text-[9px] text-right text-muted-foreground font-bold italic">Taxa de Conversão: {percent.toFixed(1)}%</p>
      )}
    </div>
  );
}
