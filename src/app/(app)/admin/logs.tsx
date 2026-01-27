'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type AdminLogRow = {
  id: string;
  admin_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
};

export default function AdminLogs() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    // garante sessão
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setErrorMsg('Sessão inválida. Faça login novamente.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('admin_logs') // ✅ SEM public.
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-4 text-sm">Carregando logs…</div>;

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
              <tr>
                <th className="p-2 text-left">Ação</th>
                <th className="p-2 text-left">Entidade</th>
                <th className="p-2 text-left">ID Entidade</th>
                <th className="p-2 text-left">Admin</th>
                <th className="p-2 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.action}</td>
                  <td className="p-2">{l.entity}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {l.entity_id ?? '-'}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {l.admin_id}
                  </td>
                  <td className="p-2 text-xs">
                    {new Date(l.created_at).toLocaleString()}
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
