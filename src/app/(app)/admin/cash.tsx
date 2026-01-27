'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function AdminCash() {
  const supabase = getSupabaseClient();
  const [cash, setCash] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('cash_registers')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setCash(data ?? []));
  }, []);

  return (
    <ul className="space-y-2">
      {cash.map(c => (
        <li key={c.id} className="border p-3 rounded">
          Loja: {c.store_id} | Abertura: {c.opening_amount_cents / 100}
        </li>
      ))}
    </ul>
  );
}
