'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

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

      // 🔐 garante sessão válida (necessário para RLS)
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

    // 🧾 Log administrativo via INSERT direto. Mais robusto que depender de uma RPC.
    const { error: logError } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: action,
        entity: 'users',
        entity_id: id,
      });

    if (logError) {
        // Não bloqueia a UI, mas avisa no console sobre a falha no log.
        console.warn("Falha ao registrar ação administrativa:", logError.message);
    }

    setUsers(prev =>
      prev.map(u =>
        u.id === id ? ({ ...u, ...values } as AdminUserRow) : u
      )
    );
  };

  if (loading) {
    return <div className="p-4 text-sm">Carregando usuários…</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Admin • Usuários</h1>

      {errorMsg && (
        <div className="text-sm border rounded p-3 bg-red-50 text-red-700">
          {errorMsg}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhum usuário encontrado.
        </div>
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
                      onClick={() =>
                        updateUser(
                          u.id,
                          { is_admin: !u.is_admin },
                          'toggle_admin'
                        )
                      }
                    >
                      Toggle Admin
                    </button>
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() =>
                        updateUser(
                          u.id,
                          { is_blocked: !u.is_blocked },
                          'toggle_block'
                        )
                      }
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
