
'use client';

import { PageHeader } from '@/components/page-header';
import AdminAnalytics from '../analytics';

export default function AdminGlobalAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Análise de Tráfego" 
        subtitle="Insights sobre o engajamento e comportamento dos usuários nas lojas." 
      />
      <AdminAnalytics />
    </div>
  );
}
