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
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);

  useEffect(() => {
    async function validateAdminSession() {
      setLoading(true);
      setErrorMsg(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMsg(`Erro ao validar sessão: ${authError?.message || 'Acesso negado. Faça login para continuar.'}`);
        setLoading(false);
        return;
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        setErrorMsg(`Erro ao verificar permissões: ${profileError.message}`);
        setLoading(false);
        return;
      }
      
      if (!profile?.is_admin) {
        setErrorMsg('Acesso negado. Você não tem permissão para acessar esta página.');
        setLoading(false);
        return;
      }

      setIsVerifiedAdmin(true);
      setLoading(false);
    }

    validateAdminSession();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm">Validando permissões de administrador…</div>;
  }

  if (errorMsg || !isVerifiedAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Painel Administrativo</h1>
        <div className="border rounded p-4 bg-red-50 text-red-700 text-sm">
          {errorMsg || 'Acesso negado.'}
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
