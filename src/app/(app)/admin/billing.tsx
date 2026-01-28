'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday, format } from 'date-fns';

type BillingStat = {
    total_revenue: number;
    new_subscriptions: number;
    cancellations: number;
    revenue_by_provider: { provider: string, total: number }[];
    recent_events: any[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);


export default function AdminBilling() {
  const [stats, setStats] = useState<BillingStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -29),
    to: new Date(),
  });

  useEffect(() => {
    async function loadBillingStats() {
      if (!dateRange?.from) return;
      setLoading(true);
      setErrorMsg(null);

      const fromDate = dateRange.from.toISOString();
      const toDate = (dateRange.to || dateRange.from).toISOString();

      const { data, error } = await supabase.rpc('get_billing_analytics', {
          p_from: fromDate,
          p_to: toDate,
      });

      if (error) {
        setErrorMsg(`Erro ao buscar estatísticas de faturamento: ${error.message}`);
        setStats(null);
      } else {
        setStats(data[0] as BillingStat);
      }
      setLoading(false);
    }

    loadBillingStats();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
        </div>
        <Card>
            <CardHeader><CardTitle>Eventos Recentes</CardTitle></CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full mt-2" />
                <Skeleton className="h-8 w-full mt-2" />
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
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats?.total_revenue ?? 0)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Novas Assinaturas</CardTitle>
                    <ArrowUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.new_subscriptions ?? 0}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
                    <ArrowDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.cancellations ?? 0}</div>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Receita por Provedor</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Provedor</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats?.revenue_by_provider?.map(p => (
                                <TableRow key={p.provider}>
                                    <TableCell className="font-medium capitalize">{p.provider}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity /> Eventos Recentes de Assinatura</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Evento</TableHead>
                                <TableHead>Provedor</TableHead>
                                <TableHead>Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats?.recent_events?.map(e => (
                                <TableRow key={e.id}>
                                    <TableCell className="font-medium">{e.event_type}</TableCell>
                                    <TableCell className="capitalize">{e.provider}</TableCell>
                                    <TableCell>{format(new Date(e.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
