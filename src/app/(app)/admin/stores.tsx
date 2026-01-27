'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function AdminStores() {
  const supabase = getSupabaseClient();
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('stores')
      .select('id, name, user_id, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setStores(data ?? []));
  }, []);

  return (
    <ul className="space-y-2">
      {stores.map(s => (
        <li key={s.id} className="border p-3 rounded">
          <strong>{s.name}</strong>
          <div className="text-xs opacity-70">Owner: {s.user_id}</div>
        </li>
      ))}
    </ul>
  );
}
