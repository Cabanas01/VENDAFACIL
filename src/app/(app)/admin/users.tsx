'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type AdminUserRow = {
  id: string;
  email: string | null;
  is_admin: boolean | null;
  is_blocked: boolean | null;
};

export default function AdminUsers() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    // Sessão (ajuda a diagnosticar RLS / auth.uid())
    const { data: sessData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      setErrorMsg(`Erro sessão: ${sessErr.message}`);
      setLoading(false);
      return;
    }
    if (!sessData.session) {
      setErrorMsg('Você não está logado (sessão vazia). Faça login e tente novamente.');
      setLoading(false);
      return;
    }

    // ✅ NÃO usa created_at (porque sua tabela não tem)
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = async (id: string, values: Partial<AdminUserRow>, action: string) => {
    setErrorMsg(null);

    const { error } = await supabase.from('users').update(values).eq('id', id);
    if (error) {
      setErrorMsg(`Erro ao atualizar: ${error.message}`);
      return;
    }

    // log opcional (só se existir rpc)
    await supabase.rpc('log_admin_action', {
      p_action: action,
      p_entity: 'users',
      p_entity_id: id,
    }).catch(() => {});

    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...values } as AdminUserRow : u)));
  };

  if (loading) return <div className="p-4 text-sm">Carregando usuários...</div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Admin • Usuários</h1>

      {errorMsg && (
        <div className="text-sm border rounded p-3 bg-red-50 text-red-700">
          {errorMsg}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2">Email</th>
                <th className="p-2">Admin</th>
                <th className="p-2">Bloqueado</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.email ?? '-'}</td>
                  <td className="p-2">{u.is_admin ? '✅' : '❌'}</td>
                  <td className="p-2">{u.is_blocked ? '⛔' : '🟢'}</td>
                  <td className="p-2 space-x-2">
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => updateUser(u.id, { is_admin: !u.is_admin }, 'toggle_admin')}
                    >
                      Toggle Admin
                    </button>
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => updateUser(u.id, { is_blocked: !u.is_blocked }, 'toggle_block')}
                    >
                      Toggle Block
                    </button>
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
