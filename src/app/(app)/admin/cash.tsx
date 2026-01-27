'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type CashRegisterRow = {
  id: string;
  store_id: string;
  opening_amount_cents: number;
  opened_at: string | null;
};

export default function AdminCash() {
  const [cash, setCash] = useState<CashRegisterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadCash() {
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
        .from('cash_registers')
        .select('id, store_id, opening_amount_cents, opened_at')
        .order('opened_at', { ascending: false })
        .limit(30);

      if (error) {
        setErrorMsg(`Erro ao buscar caixas: ${error.message}`);
        setCash([]);
        setLoading(false);
        return;
      }

      setCash((data ?? []) as CashRegisterRow[]);
      setLoading(false);
    }

    loadCash();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm">Carregando caixas…</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Admin • Caixas</h1>

      {errorMsg && (
        <div className="text-sm border rounded p-3 bg-red-50 text-red-700">
          {errorMsg}
        </div>
      )}

      {cash.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhum caixa encontrado.
        </div>
      ) : (
        <ul className="space-y-2">
          {cash.map(c => (
            <li key={c.id} className="border p-3 rounded text-sm">
              <div><strong>Loja:</strong> {c.store_id}</div>
              <div>
                <strong>Abertura:</strong>{' '}
                {(c.opening_amount_cents / 100).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.opened_at ? new Date(c.opened_at).toLocaleString() : '-'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
