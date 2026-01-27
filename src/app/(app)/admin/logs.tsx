'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function AdminLogs() {
  const supabase = getSupabaseClient();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setLogs(data ?? []));
  }, []);

  return (
    <ul className="text-sm space-y-2">
      {logs.map(l => (
        <li key={l.id} className="border p-2 rounded">
          <strong>{l.action}</strong> em {l.entity} —{' '}
          {new Date(l.created_at).toLocaleString()}
        </li>
      ))}
    </ul>
  );
}
