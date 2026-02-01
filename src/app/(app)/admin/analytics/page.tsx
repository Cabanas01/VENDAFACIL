'use client';

import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import AdminAnalytics from '../analytics';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminGlobalAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Análise de Tráfego" 
        subtitle="Insights sobre o engajamento e comportamento dos usuários nas lojas." 
      />
      <Suspense fallback={
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      }>
        <AdminAnalytics />
      </Suspense>
    </div>
  );
}
