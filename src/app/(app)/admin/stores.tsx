'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type StoreRow = {
  id: string;
  name: string | null;
  user_id: string | null;
};

export default function AdminStores() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadStores() {
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
        .from('stores')
        .select('id, name, user_id');

      if (error) {
        setErrorMsg(`Erro ao buscar lojas: ${error.message}`);
        setStores([]);
        setLoading(false);
        return;
      }

      setStores((data ?? []) as StoreRow[]);
      setLoading(false);
    }

    loadStores();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lojas</CardTitle>
          <CardDescription>Visualize todas as lojas cadastradas no sistema.</CardDescription>
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
        <CardTitle>Lojas</CardTitle>
        <CardDescription>Visualize todas as lojas cadastradas no sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        {stores.length === 0 && !errorMsg ? (
          <div className="text-center text-sm text-muted-foreground p-8">
            Nenhuma loja encontrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID da Loja</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>ID do Dono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.name ?? '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{s.user_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
