'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type AdminUserRow = {
  id: string;
  email: string | null;
  is_admin: boolean;
  is_blocked: boolean;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
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
        .from('users')
        .select('id, email, is_admin, is_blocked')
        .order('email', { ascending: true });

      if (error) {
        setErrorMsg(`Erro ao buscar usuários: ${error.message}`);
        setUsers([]);
        setLoading(false);
        return;
      }

      setUsers((data ?? []) as AdminUserRow[]);
      setLoading(false);
    }

    loadUsers();
  }, []);

  const updateUser = async (
    id: string,
    values: Partial<AdminUserRow>,
    action: 'toggle_admin' | 'toggle_block'
  ) => {
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setErrorMsg('Sua sessão expirou ou é inválida. Faça login novamente.');
        return;
    }

    const { error } = await supabase
      .from('users')
      .update(values)
      .eq('id', id);

    if (error) {
      setErrorMsg(`Erro ao atualizar usuário: ${error.message}`);
      return;
    }

    const { error: logError } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: action,
        entity: 'users',
        entity_id: id,
      });

    if (logError) {
        console.warn("Falha ao registrar ação administrativa:", logError.message);
    }

    setUsers(prev =>
      prev.map(u =>
        u.id === id ? ({ ...u, ...values } as AdminUserRow) : u
      )
    );
  };

  if (loading) {
    return (
     <Card>
       <CardHeader>
         <CardTitle>Usuários Globais</CardTitle>
         <CardDescription>Gerencie todos os usuários do sistema, permissões e status de bloqueio.</CardDescription>
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
        <CardTitle>Usuários Globais</CardTitle>
        <CardDescription>Gerencie todos os usuários do sistema, permissões e status de bloqueio.</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        {users.length === 0 && !errorMsg ? (
          <div className="text-center text-sm text-muted-foreground p-8">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Admin</TableHead>
                <TableHead className="text-center">Bloqueado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email ?? '-'}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={u.is_admin}
                      onCheckedChange={(checked) =>
                        updateUser(u.id, { is_admin: checked }, 'toggle_admin')
                      }
                      aria-label="Toggle Admin"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={u.is_blocked}
                      onCheckedChange={(checked) =>
                        updateUser(u.id, { is_blocked: checked }, 'toggle_block')
                      }
                      aria-label="Toggle Block"
                      className="data-[state=checked]:bg-destructive"
                    />
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
