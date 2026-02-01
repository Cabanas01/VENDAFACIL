'use client';

/**
 * @fileOverview Gestão de Faturamento Admin (CLIENT AGGREGATION)
 * 
 * Consome billing_events e agrupa métricas no frontend para evitar erros de SQL.
 */

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, startOfDay, endOfDay, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export default function AdminBilling() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -29),
    to: new Date(),
  });

  useEffect(() => {
    async function loadBillingData() {
      if (!dateRange?.from) return;
      setLoading(true);

      const from = startOfDay(dateRange.from).toISOString();
      const to = endOfDay(dateRange.to || dateRange.from).toISOString();

      const { data, error } = await supabase
        .from('billing_events')
        .select('*')
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false });

      if (!error) setEvents(data || []);
      setLoading(false);
    }

    loadBillingData();
  }, [dateRange]);

  // Agregações no frontend (Regra de Ouro: Sem agregações aninhadas no SQL)
  const stats = useMemo(() => {
    return events.reduce((acc, ev) => {
      const amount = ev.amount || 0;
      if (ev.event_type === 'PURCHASE_APPROVED') {
        acc.revenue += amount;
        acc.newSubscriptions += 1;
      }
      if (ev.event_type === 'CANCELLED' || ev.event_type === 'REFUNDED') {
        acc.cancellations += 1;
      }
      return acc;
    }, { revenue: 0, newSubscriptions: 0, cancellations: 0 });
  }, [events]);

  const revenueByProvider = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach(ev => {
      if (ev.event_type === 'PURCHASE_APPROVED') {
        map[ev.provider] = (map[ev.provider] || 0) + (ev.amount || 0);
      }
    });
    return Object.entries(map).map(([provider, total]) => ({ provider, total }));
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-end">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard title="Receita Bruta" value={formatCurrency(stats.revenue)} icon={<DollarSign />} color="text-primary" />
            <MetricCard title="Novas Assinaturas" value={stats.newSubscriptions} icon={<ArrowUp />} color="text-green-600" />
            <MetricCard title="Cancelamentos" value={stats.cancellations} icon={<ArrowDown />} color="text-red-600" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest">Receita por Provedor</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            {revenueByProvider.map(p => (
                                <TableRow key={p.provider}>
                                    <TableCell className="font-bold uppercase text-[10px]">{p.provider}</TableCell>
                                    <TableCell className="text-right font-black">{formatCurrency(p.total)}</TableCell>
                                </TableRow>
                            ))}
                            {revenueByProvider.length === 0 && (
                              <TableRow><TableCell className="text-center py-10 text-muted-foreground text-xs">Sem transações no período.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Activity className="h-4 w-4" /> Log de Faturamento</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-[10px] uppercase font-black">Evento</TableHead>
                                <TableHead className="text-[10px] uppercase font-black">Data</TableHead>
                                <TableHead className="text-right text-[10px] uppercase font-black">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.slice(0, 10).map(e => (
                                <TableRow key={e.id}>
                                    <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase">{e.event_type.replace(/_/g, ' ')}</Badge></TableCell>
                                    <TableCell className="text-[10px] font-bold">{format(new Date(e.created_at), 'dd/MM HH:mm')}</TableCell>
                                    <TableCell className="text-right font-black text-xs">{formatCurrency(e.amount || 0)}</TableCell>
                                </TableRow>
                            ))}
                            {events.length === 0 && (
                              <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground text-xs uppercase font-black tracking-widest">Nenhum evento registrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string, value: any, icon: any, color: string }) {
  return (
    <Card className="border-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
        <div className={color}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tracking-tighter">{value}</div>
      </CardContent>
    </Card>
  );
}