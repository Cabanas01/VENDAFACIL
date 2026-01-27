'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function AdminUsers() {
  const supabase = getSupabaseClient();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setUsers(data ?? []));
  }, []);

  const updateUser = async (id: string, values: any, action: string) => {
    await supabase.from('users').update(values).eq('id', id);
    await supabase.rpc('log_admin_action', {
      p_action: action,
      p_entity: 'users',
      p_entity_id: id,
    });

    setUsers(prev =>
      prev.map(u => (u.id === id ? { ...u, ...values } : u))
    );
  };

  return (
    <table className="w-full text-sm border">
      <thead>
        <tr>
          <th>Email</th>
          <th>Admin</th>
          <th>Bloqueado</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <td>{u.email}</td>
            <td>{u.is_admin ? '✅' : '❌'}</td>
            <td>{u.is_blocked ? '⛔' : '🟢'}</td>
            <td className="space-x-2">
              <button onClick={() => updateUser(u.id, { is_admin: !u.is_admin }, 'toggle_admin')}>
                Admin
              </button>
              <button onClick={() => updateUser(u.id, { is_blocked: !u.is_blocked }, 'toggle_block')}>
                Bloquear
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
