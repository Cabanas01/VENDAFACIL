'use client';

/**
 * @fileOverview AdminPage (Visão Geral)
 * 
 * Agora atua como o dashboard central do administrador do SaaS.
 * O redirecionamento e permissão são controlados pelo backend e pelo AppLayout.
 */

import { PageHeader } from '@/components/page-header';
import AdminDashboard from './dashboard';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Visão Geral do SaaS" 
        subtitle="Métricas globais de todas as lojas e faturamento do sistema." 
      />
      
      <AdminDashboard />
      
      {/* Aqui podem entrar cards de alerta rápido, lojas em trial expirando, etc. */}
    </div>
  );
}
