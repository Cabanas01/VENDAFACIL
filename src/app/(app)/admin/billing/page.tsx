
'use client';

import { PageHeader } from '@/components/page-header';
import AdminBilling from '../billing';

export default function AdminGlobalBillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fluxo de Caixa SaaS" 
        subtitle="Monitoramento de assinaturas, renovações e cancelamentos (Hotmart)." 
      />
      <AdminBilling />
    </div>
  );
}
