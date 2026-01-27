'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function AdminSales() {
  const supabase = getSupabaseClient();
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('sales')
      .select('id, store_id, total_cents, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setSales(data ?? []));
  }, []);

  return (
    <table className="w-full text-sm border">
      <thead>
        <tr>
          <th>Loja</th>
          <th>Total</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>
        {sales.map(s => (
          <tr key={s.id}>
            <td>{s.store_id}</td>
            <td>R$ {(s.total_cents / 100).toFixed(2)}</td>
            <td>{new Date(s.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
