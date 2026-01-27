'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type SaleRow = {
  id: string;
  store_id: string;
  total_cents: number;
  created_at: string;
};

export default function AdminSales() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadSales() {
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
        .from('sales')
        .select('id, store_id, total_cents, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setErrorMsg(`Erro ao buscar vendas: ${error.message}`);
        setSales([]);
        setLoading(false);
        return;
      }

      setSales((data ?? []) as SaleRow[]);
      setLoading(false);
    }

    loadSales();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm">Carregando vendas…</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Admin • Vendas</h1>

      {errorMsg && (
        <div className="text-sm border rounded p-3 bg-red-50 text-red-700">
          {errorMsg}
        </div>
      )}

      {sales.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhuma venda encontrada.
        </div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2">Loja</th>
                <th className="p-2">Total</th>
                <th className="p-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="p-2 text-xs text-muted-foreground">
                    {s.store_id}
                  </td>
                  <td className="p-2">
                    {(s.total_cents / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="p-2 text-xs">
                    {new Date(s.created_at).toLocaleString()}
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
