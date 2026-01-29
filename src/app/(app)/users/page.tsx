'use client';

import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfToday } from 'date-fns';
import {
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnalytics } from '@/lib/analytics/track';

export default function UsersAnalyticsPage() {
  const router = useRouter();
  const { registerUniqueClick } = useAnalytics();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(startOfToday(), -6),
    to: new Date(),
  });

  const handleGoToBilling = () => {
      registerUniqueClick('go_billing_from_analytics');
      router.push('/billing');
  }

  return (
    <>
      <PageHeader title="Usuários & Eventos" subtitle="Analise o comportamento e a atividade na sua loja.">
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </PageHeader>
      
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="manage" disabled>Gerenciar Usuários (em breve)</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Análise de Tráfego</CardTitle>
                    <CardDescription>
                        A análise detalhada de tráfego e comportamento de usuários foi movida para o painel de Administração global do sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground p-8">
                    <p>Funcionalidade de Analytics movida para o painel de Administração.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                    <CardDescription>Você ainda pode testar eventos de clique único.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button onClick={handleGoToBilling} variant="outline">
                        <Wallet className="mr-2" />
                        Ir para Assinaturas (Testar Clique Único)
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
