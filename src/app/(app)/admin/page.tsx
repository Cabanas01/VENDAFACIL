'use client';

import { useState } from 'react';
import AdminUsers from './users';
import AdminStores from './stores';
import AdminSales from './sales';
import AdminCash from './cash';
import AdminLogs from './logs';

const tabs = [
  { id: 'users', label: 'Usuários' },
  { id: 'stores', label: 'Lojas' },
  { id: 'sales', label: 'Vendas' },
  { id: 'cash', label: 'Caixas' },
  { id: 'logs', label: 'Logs' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('users');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Painel Administrativo</h1>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded ${
              tab === t.id ? 'bg-black text-white' : 'bg-muted'
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
