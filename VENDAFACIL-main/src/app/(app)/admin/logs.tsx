'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type AdminLogRow = {
  id: string;
  admin_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
  admin_email?: string;
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
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

      const { data: logsData, error } = await supabase
        .from('admin_logs')
        .select('id, admin_id, action, entity, entity_id, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMsg(`Erro ao buscar logs: ${error.message}`);
        setLogs([]);
        setLoading(false);
        return;
      }
      
      if (!logsData || logsData.length === 0) {
          setLogs([]);
          setLoading(false);
          return;
      }

      const adminIds = [...new Set(logsData.map(log => log.admin_id).filter(Boolean))];
      if (adminIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .in('id', adminIds);
        
        if (usersError) {
          console.warn("Não foi possível buscar os emails dos administradores:", usersError);
          setLogs((logsData ?? []) as AdminLogRow[]);
        } else {
          const adminEmailMap = new Map((usersData ?? []).map(u => [u.id, u.email as string]));
          const logsWithEmails = logsData.map(log => ({
            ...log,
            admin_email: adminEmailMap.get(log.admin_id),
          }));
          setLogs(logsWithEmails);
        }
      } else {
        setLogs((logsData ?? []) as AdminLogRow[]);
      }

      setLoading(false);
    }

    loadLogs();
  }, []);

  if (loading) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
          <CardDescription>Ações administrativas críticas realizadas no sistema.</CardDescription>
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
        <CardTitle>Logs de Auditoria</CardTitle>
        <CardDescription>Ações administrativas críticas realizadas no sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {logs.length === 0 && !errorMsg ? (
          <div className="text-center text-sm text-muted-foreground p-8">
            Nenhum log registrado ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID da Entidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.admin_email ?? log.admin_id}
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.entity_id ?? '-'}
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
