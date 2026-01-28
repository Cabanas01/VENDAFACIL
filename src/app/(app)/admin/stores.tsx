'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Lock, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type StoreRow = {
  id: string;
  name: string | null;
  user_id: string | null;
  owner_email?: string | null;
  status: 'active' | 'suspended' | 'blocked'; // Mocked for now
  plan: 'free' | 'monthly' | 'yearly'; // Mocked for now
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
      if (userErr || !userData.user) {
        setErrorMsg(`Sessão inválida: ${userErr?.message || 'Faça login novamente.'}`);
        setLoading(false);
        return;
      }

      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, user_id');

      if (storesError) {
        setErrorMsg(`Erro ao buscar lojas: ${storesError.message}`);
        setLoading(false);
        return;
      }
      
      if (!storesData || storesData.length === 0) {
        setStores([]);
        setLoading(false);
        return;
      }

      // Fetch user emails for owners
      const ownerIds = [...new Set(storesData.map(s => s.user_id).filter(Boolean))];
      let ownerEmailMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .in('id', ownerIds as string[]);

        if (usersError) {
          console.warn("Could not fetch owner emails:", usersError.message);
        } else {
          ownerEmailMap = new Map((usersData ?? []).map(u => [u.id, u.email as string]));
        }
      }

      // Combine data and add mocked status/plan
      const combinedData = storesData.map((store, index) => ({
        ...store,
        owner_email: store.user_id ? ownerEmailMap.get(store.user_id) : 'N/A',
        // Mock data for status and plan for demonstration
        status: (['active', 'suspended', 'blocked'] as const)[index % 3],
        plan: (['free', 'monthly', 'yearly'] as const)[index % 3],
      }));

      setStores(combinedData as StoreRow[]);
      setLoading(false);
    }

    loadStores();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Lojas</CardTitle>
          <CardDescription>Visualize e gerencie todas as lojas (tenants) do sistema.</CardDescription>
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
        <CardTitle>Gerenciamento de Lojas</CardTitle>
        <CardDescription>Visualize e gerencie todas as lojas (tenants) do sistema.</CardDescription>
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
                <TableHead>Loja</TableHead>
                <TableHead>Dono (Email)</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name ?? '-'}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.id}</div>
                  </TableCell>
                  <TableCell>{s.owner_email ?? '-'}</TableCell>
                   <TableCell>
                    <Badge variant="secondary" className="capitalize">{s.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'active' ? 'default' : s.status === 'suspended' ? 'outline' : 'destructive'} className={`${s.status === 'active' ? 'bg-green-500' : ''} capitalize`}>
                      {s.status === 'active' ? 'Ativa' : s.status === 'suspended' ? 'Suspensa' : 'Bloqueada'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" /> Alterar Plano
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Lock className="mr-2 h-4 w-4" /> Suspender
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
