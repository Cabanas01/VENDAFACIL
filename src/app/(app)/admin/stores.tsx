'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type StoreRow = {
  id: string;
  name: string | null;
  user_id: string | null;
};

export default function AdminStores() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadStores() {
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
        .from('stores')
        .select('id, name, user_id');

      if (error) {
        setErrorMsg(`Erro ao buscar lojas: ${error.message}`);
        setStores([]);
        setLoading(false);
        return;
      }

      setStores((data ?? []) as StoreRow[]);
      setLoading(false);
    }

    loadStores();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm">Carregando lojas…</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Admin • Lojas</h1>

      {errorMsg && (
        <div className="text-sm border rounded p-3 bg-red-50 text-red-700">
          {errorMsg}
        </div>
      )}

      {stores.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhuma loja encontrada.
        </div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2">Nome</th>
                <th className="p-2">Owner (user_id)</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.name ?? '-'}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {s.user_id}
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
