'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type CashRegisterRow = {
  id: string;
  store_id: string;
  opening_amount_cents: number;
  opened_at: string | null;
};

export default function AdminCash() {
  const [cash, setCash] = useState<CashRegisterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadCash() {
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
        .from('cash_registers')
        .select('id, store_id, opening_amount_cents, opened_at')
        .order('opened_at', { ascending: false })
        .limit(30);

      if (error) {
        setErrorMsg(`Erro ao buscar caixas: ${error.message}`);
        setCash([]);
        setLoading(false);
        return;
      }

      setCash((data ?? []) as CashRegisterRow[]);
      setLoading(false);
    }

    loadCash();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Caixas Globais</CardTitle>
          <CardDescription>Visualize os últimos 30 registros de caixa de todo o sistema.</CardDescription>
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
        <CardTitle>Caixas Globais</CardTitle>
        <CardDescription>Visualize os últimos 30 registros de caixa de todo o sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        {cash.length === 0 && !errorMsg ? (
           <div className="text-center text-sm text-muted-foreground p-8">
            Nenhum caixa encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data de Abertura</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Valor de Abertura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cash.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.opened_at ? new Date(c.opened_at).toLocaleString() : '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{c.store_id}</TableCell>
                  <TableCell className="text-right font-medium">
                    {(c.opening_amount_cents / 100).toLocaleString('pt-BR', {
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
