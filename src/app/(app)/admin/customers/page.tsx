
'use client';

import { PageHeader } from '@/components/page-header';
import AdminCustomers from '../customers';

export default function AdminGlobalCustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Base de Clientes Global" 
        subtitle="Visualize todos os clientes cadastrados em todos os tenants." 
      />
      <AdminCustomers />
    </div>
  );
}
