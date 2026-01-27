'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type AdminUser = {
  id: string;
  email: string;
  is_admin: boolean;
  is_blocked: boolean;
  created_at: string;
};

export default function AdminUsers() {
  const supabase = getSupabaseClient();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('users') // 👈 CRÍTICO
        .select('id, email, is_admin, is_blocked, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários:', error);
      } else {
        setUsers(data ?? []);
      }

      setLoading(false);
    };

    fetchUsers();
  }, [supabase]);

  const updateUser = async (
    id: string,
    values: Partial<AdminUser>,
    action: string
  ) => {
    const { error } = await supabase
      .from('users') // 👈 CRÍTICO
      .update(values)
      .eq('id', id);

    if (!error) {
      await supabase.rpc('log_admin_action', {
        p_action: action,
        p_entity: 'users',
        p_entity_id: id,
      });

      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, ...values } : u))
      );
    }
  };

  if (loading) {
    return <p>Carregando usuários...</p>;
  }

  if (users.length === 0) {
    return <p>Nenhum usuário encontrado.</p>;
  }

  return (
    <table className="w-full text-sm border">
      <thead>
        <tr>
          <th className="p-2 text-left">Email</th>
          <th className="p-2 text-center">Admin</th>
          <th className="p-2 text-center">Bloqueado</th>
          <th className="p-2 text-center">Ações</th>
        </tr>
      </thead>

      <tbody>
        {users.map(u => (
          <tr key={u.id} className="border-t">
            <td className="p-2">{u.email}</td>
            <td className="p-2 text-center">{u.is_admin ? '✅' : '❌'}</td>
            <td className="p-2 text-center">{u.is_blocked ? '⛔' : '🟢'}</td>
            <td className="p-2 text-center space-x-2">
              <button
                onClick={() =>
                  updateUser(u.id, { is_admin: !u.is_admin }, 'toggle_admin')
                }
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
              >
                {u.is_admin ? 'Remover admin' : 'Tornar admin'}
              </button>

              <button
                onClick={() =>
                  updateUser(
                    u.id,
                    { is_blocked: !u.is_blocked },
                    'toggle_block'
                  )
                }
                className="px-2 py-1 text-xs bg-red-600 text-white rounded"
              >
                {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
