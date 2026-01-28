'use client';

import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/auth-provider';
import { useAccess } from '@/hooks/use-entitlements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, XCircle, CreditCard, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const getStatusInfo = (accessStatus: import('@/lib/types').StoreAccessStatus | null) => {
    if (!accessStatus) {
        return {
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            text: 'Verificando...',
            badgeVariant: 'secondary' as const,
            description: 'Aguarde enquanto verificamos o status do seu acesso.',
            planName: 'N/A'
        }
    }

    if (accessStatus.plano_nome === 'Erro') {
        return {
            icon: <XCircle className="h-5 w-5 text-destructive" />,
            text: 'Erro de Verificação',
            badgeVariant: 'destructive' as const,
            description: accessStatus.mensagem,
            planName: 'Erro'
        }
    }

    const isExpired = !accessStatus.acesso_liberado && (accessStatus.mensagem.includes('expirou') || accessStatus.mensagem.includes('bloqueado'));
    const isWaiting = !accessStatus.acesso_liberado && accessStatus.mensagem.includes('aguardando');

    if (isExpired) {
        return {
            icon: <XCircle className="h-5 w-5 text-destructive" />,
            text: 'Acesso Expirado',
            badgeVariant: 'destructive' as const,
            description: accessStatus.mensagem,
            planName: accessStatus.plano_nome
        }
    }
    if (isWaiting) {
        return {
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            text: 'Aguardando Liberação',
            badgeVariant: 'secondary' as const,
            description: accessStatus.mensagem,
            planName: accessStatus.plano_nome
        }
    }
    // Default to active
    return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        text: 'Plano Ativo',
        badgeVariant: 'default' as const,
        description: accessStatus.mensagem,
        planName: accessStatus.plano_nome
    }
}


export default function BillingPage() {
  const { store } = useAuth();
  const { accessStatus, isLoading } = useAccess();

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

  const statusInfo = getStatusInfo(accessStatus);
  
  return (
    <>
      <PageHeader title="Plano e Assinatura" subtitle="Gerencie sua assinatura e veja seu histórico de cobranças." />
      
      <div className="grid gap-8 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Situação do Acesso</CardTitle>
            <CardDescription>Informações sobre o seu plano de acesso atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="font-bold text-lg">{statusInfo.planName}</div>
                <Badge variant={statusInfo.badgeVariant} className="flex items-center gap-2">
                    {statusInfo.icon}
                    <span>{statusInfo.text}</span>
                </Badge>
            </div>

            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
            
          </CardContent>
          <CardFooter>
            <Button>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Ver Planos e Renovar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
