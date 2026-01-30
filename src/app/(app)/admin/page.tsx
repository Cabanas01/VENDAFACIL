
'use client';

import { PageHeader } from '@/components/page-header';
import AdminDashboard from './dashboard';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Painel SaaS" 
        subtitle="Visão consolidada de faturamento, lojas e métricas globais do sistema." 
      />
      <AdminDashboard />
    </div>
  );
}
