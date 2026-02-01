'use client';

/**
 * @fileOverview Gestão de Faturamento (Admin) - Seguro e Defensivo
 * 
 * Implementa agregação no frontend para evitar erros de SQL aninhado.
 */

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ArrowUp, ArrowDown, Receipt } from 'lucide-react';
import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, startOfDay, endOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export default function AdminBilling() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -29),
    to: new Date(),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function loadBillingEvents() {
      if (!dateRange?.from || !isMounted) return;
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

    if (isMounted) loadBillingEvents();
  }, [dateRange, isMounted]);

  // Agregações Determinísticas (Frontend Pure)
  const stats = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    return safeEvents.reduce((acc, ev) => {
      if (!ev) return acc;
      const amount = Number(ev.amount) || 0;
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
    const safeEvents = Array.isArray(events) ? events : [];
    const map: Record<string, number> = {};
    safeEvents.forEach(ev => {
      if (ev && ev.event_type === 'PURCHASE_APPROVED') {
        const provider = ev.provider || 'desconhecido';
        map[provider] = (map[provider] || 0) + (Number(ev.amount) || 0);
      }
    });
    return Object.entries(map).map(([provider, total]) => ({ provider, total }));
  }, [events]);

  if (!isMounted) return <div className="py-20 text-center animate-pulse">Sincronizando fluxo financeiro...</div>;

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
            <MetricCard title="Vendas Aprovadas" value={stats.newSubscriptions} icon={<ArrowUp />} color="text-green-600" />
            <MetricCard title="Estornos/Cancelamentos" value={stats.cancellations} icon={<ArrowDown />} color="text-red-600" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm">
                <CardHeader className="border-b bg-muted/10"><CardTitle className="text-xs font-black uppercase tracking-widest">Performance por Provedor</CardTitle></CardHeader>
                <CardContent className="pt-4">
                    <Table>
                        <TableBody>
                            {revenueByProvider.map(p => (
                                <TableRow key={p.provider} className="hover:bg-transparent">
                                    <TableCell className="font-bold uppercase text-[10px] text-muted-foreground">{p.provider}</TableCell>
                                    <TableCell className="text-right font-black text-primary">{formatCurrency(p.total)}</TableCell>
                                </TableRow>
                            ))}
                            {revenueByProvider.length === 0 && (
                              <TableRow><TableCell className="text-center py-10 text-muted-foreground text-[10px] uppercase font-black">Sem movimentação financeira</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
                <CardHeader className="border-b bg-muted/10"><CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Log de Transações</CardTitle></CardHeader>
                <CardContent className="p-0">
                     <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="text-[9px] uppercase font-black px-6">Evento</TableHead>
                                <TableHead className="text-[9px] uppercase font-black px-6">Data</TableHead>
                                <TableHead className="text-right text-[9px] uppercase font-black px-6">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.slice(0, 10).map(e => (
                                <TableRow key={e.id} className="hover:bg-primary/5 transition-colors border-b border-muted/10">
                                    <TableCell className="px-6"><Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20">{e.event_type?.replace(/_/g, ' ')}</Badge></TableCell>
                                    <TableCell className="text-[10px] font-bold text-muted-foreground px-6">{e.created_at ? format(new Date(e.created_at), 'dd/MM HH:mm') : '-'}</TableCell>
                                    <TableCell className="text-right font-black text-xs px-6">{formatCurrency(Number(e.amount) || 0)}</TableCell>
                                </TableRow>
                            ))}
                            {events.length === 0 && (
                              <TableRow><TableCell colSpan={3} className="text-center py-20 text-muted-foreground text-[10px] font-black uppercase tracking-widest">Nenhum registro localizado</TableCell></TableRow>
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
    <Card className="border-primary/5 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{title}</CardTitle>
        <div className={color}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tracking-tighter">{value ?? 0}</div>
      </CardContent>
    </Card>
  );
}
