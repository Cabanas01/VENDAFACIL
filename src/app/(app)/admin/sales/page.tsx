
'use client';

import { PageHeader } from '@/components/page-header';
import AdminSales from '../sales';

export default function AdminGlobalSalesPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Vendas Global" 
        subtitle="Monitoramento em tempo real de todas as transações realizadas no SaaS." 
      />
      <AdminSales />
    </div>
  );
}
