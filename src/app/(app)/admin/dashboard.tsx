
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Store, DollarSign, ShoppingCart, AlertCircle } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((value || 0) / 100);

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    users: number;
    stores: number;
    salesCount: number;
    totalRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const [
          { count: usersCount, error: usersError },
          { count: storesCount, error: storesError },
          { data: salesData, error: salesError },
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('stores').select('*', { count: 'exact', head: true }),
          supabase.from('sales').select('total_cents'),
        ]);

        if (usersError || storesError || salesError) {
          throw usersError || storesError || salesError;
        }

        const totalRevenue = (salesData || []).reduce((sum, sale) => sum + (sale.total_cents || 0), 0);
        const salesCount = (salesData || []).length;

        setStats({
          users: usersCount ?? 0,
          stores: storesCount ?? 0,
          salesCount: salesCount,
          totalRevenue: totalRevenue,
        });

      } catch (err: any) {
        console.error("Error fetching admin stats:", err);
        setError(err.message || "Falha ao carregar métricas globais.");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (error || !stats) {
      return (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error || "Erro ao processar estatísticas."}</p>
          </CardContent>
        </Card>
      );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Lojas</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.stores}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Global</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas Globais</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.salesCount.toLocaleString('pt-BR')}</div>
            </CardContent>
        </Card>
    </div>
  );
}
