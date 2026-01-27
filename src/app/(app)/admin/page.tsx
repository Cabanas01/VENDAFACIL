'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

import AdminUsers from './users';
import AdminStores from './stores';
import AdminSales from './sales';
import AdminCash from './cash';
import AdminLogs from './logs';

type TabId = 'users' | 'stores' | 'sales' | 'cash' | 'logs';

const tabs: { id: TabId; label: string }[] = [
  { id: 'users', label: 'Usuários' },
  { id: 'stores', label: 'Lojas' },
  { id: 'sales', label: 'Vendas' },
  { id: 'cash', label: 'Caixas' },
  { id: 'logs', label: 'Logs' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>('users');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function validateSession() {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase.auth.getUser();

      if (error) {
        setErrorMsg(`Erro ao validar sessão: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMsg('Acesso negado. Faça login para continuar.');
        setLoading(false);
        return;
      }

      setLoading(false);
    }

    validateSession();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm">Validando sessão…</div>;
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Painel Administrativo</h1>
        <div className="border rounded p-4 bg-red-50 text-red-700 text-sm">
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Painel Administrativo</h1>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded transition ${
              tab === t.id
                ? 'bg-black text-white'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <AdminUsers />}
      {tab === 'stores' && <AdminStores />}
      {tab === 'sales' && <AdminSales />}
      {tab === 'cash' && <AdminCash />}
      {tab === 'logs' && <AdminLogs />}
    </div>
  );
}
