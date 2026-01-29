'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type SaleRow = {
  id: string;
  store_id: string;
  total_cents: number;
  created_at: string;
};

export default function AdminSales() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadSales() {
      setLoading(true);
      setErrorMsg(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        setErrorMsg(`Erro ao validar sessão: ${userErr.message}`);
        setLoading(false);
        return;
      }

      if (!userData.user) {
        setErrorMsg('Sessão inválida. Faça login novamente.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('sales')
        .select('id, store_id, total_cents, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setErrorMsg(`Erro ao buscar vendas: ${error.message}`);
        setSales([]);
        setLoading(false);
        return;
      }

      setSales((data ?? []) as SaleRow[]);
      setLoading(false);
    }

    loadSales();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas Globais</CardTitle>
          <CardDescription>Visualize as últimas 50 vendas realizadas em todo o sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas Globais</CardTitle>
        <CardDescription>Visualize as últimas 50 vendas realizadas em todo o sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        {sales.length === 0 && !errorMsg ? (
          <div className="text-center text-sm text-muted-foreground p-8">
            Nenhuma venda encontrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{s.store_id}</TableCell>
                  <TableCell className="text-right font-medium">
                    {(s.total_cents / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
