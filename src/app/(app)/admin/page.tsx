'use client';

/**
 * @fileOverview Página Principal do Painel Administrativo.
 * 
 * A segurança agora é gerenciada pelo AdminLayout (Server Component),
 * permitindo que esta página se foque apenas na exibição dos dados.
 */

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
