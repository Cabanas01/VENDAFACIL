'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type AdminLogRow = {
  id: string;
  admin_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      setErrorMsg(null);

      // 🔐 garante sessão válida
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

      // 📋 busca logs (RLS decide se pode ou não)
      const { data, error } = await supabase
        .from('admin_logs')
        .select('id, admin_id, action, entity, entity_id, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMsg(`Erro ao buscar logs: ${error.message}`);
        setLogs([]);
        setLoading(false);
        return;
      }

      setLogs((data ?? []) as AdminLogRow[]);
      setLoading(false);
    }

    loadLogs();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm">Carregando logs…</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Admin • Logs</h1>

      {errorMsg && (
        <div className="text-sm border rounded p-3 bg-red-50 text-red-700">
          {errorMsg}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhum log registrado ainda.
        </div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2">Ação</th>
                <th className="p-2">Entidade</th>
                <th className="p-2">ID da Entidade</th>
                <th className="p-2">Admin</th>
                <th className="p-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t">
                  <td className="p-2">{log.action}</td>
                  <td className="p-2">{log.entity}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {log.entity_id ?? '-'}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {log.admin_id}
                  </td>
                  <td className="p-2 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
