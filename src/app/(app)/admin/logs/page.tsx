
'use client';

import { PageHeader } from '@/components/page-header';
import AdminLogs from '../logs';

export default function AdminGlobalLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Auditoria de Sistema" 
        subtitle="Rastreamento de ações críticas realizadas por administradores e automações." 
      />
      <AdminLogs />
    </div>
  );
}
