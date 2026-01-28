'use client';

import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/auth-provider';
import { useEntitlements } from '@/hooks/use-entitlements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, XCircle, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const planNames: Record<string, string> = {
  free: 'Plano Gratuito (Trial)',
  weekly: 'Plano Semanal',
  monthly: 'Plano Mensal',
  yearly: 'Plano Anual',
};

export default function BillingPage() {
  const { store } = useAuth();
  const { entitlements, isLoading } = useEntitlements();

  if (isLoading || !store) {
    return (
        <>
            <PageHeader title="Plano e Assinatura" subtitle="Gerencie sua assinatura e veja seu histórico de cobranças." />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </>
    );
  }

  const isTrial = entitlements?.plan_id === 'free';
  const isExpired = new Date() > new Date(entitlements?.access_until || 0);

  const getStatusInfo = () => {
    if (isExpired) {
        return {
            icon: <XCircle className="h-5 w-5 text-destructive" />,
            text: 'Acesso Expirado',
            badgeVariant: 'destructive' as const,
            description: `Seu acesso expirou em ${format(new Date(entitlements?.access_until || 0), 'dd/MM/yyyy')}. Para continuar usando, por favor, escolha um plano.`
        }
    }
    if (isTrial) {
        return {
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            text: 'Período de Testes',
            badgeVariant: 'secondary' as const,
            description: `Seu acesso de teste termina em ${format(new Date(entitlements?.access_until || 0), 'dd/MM/yyyy')}.`
        }
    }
    return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        text: 'Plano Ativo',
        badgeVariant: 'default' as const,
        description: `Sua assinatura está ativa e será renovada em ${format(new Date(entitlements?.access_until || 0), 'dd/MM/yyyy')}.`
    }
  }

  const statusInfo = getStatusInfo();
  const currentPlanName = entitlements ? planNames[entitlements.plan_id] : 'Nenhum plano';
  
  return (
    <>
      <PageHeader title="Plano e Assinatura" subtitle="Gerencie sua assinatura e veja seu histórico de cobranças." />
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plano Atual</CardTitle>
            <CardDescription>Informações sobre sua assinatura atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="font-bold text-lg">{currentPlanName}</div>
                <Badge variant={statusInfo.badgeVariant} className="flex items-center gap-2">
                    {statusInfo.icon}
                    <span>{statusInfo.text}</span>
                </Badge>
            </div>

            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
            
          </CardContent>
          <CardFooter>
            <Button>
                <CreditCard className="mr-2 h-4 w-4" />
                Gerenciar Assinatura
            </Button>
          </CardFooter>
        </Card>

         <Card>
          <CardHeader>
            <CardTitle>Histórico de Cobranças</CardTitle>
             <CardDescription>Aqui aparecerão suas faturas e pagamentos.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground text-sm">Nenhum histórico de cobrança ainda.</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
