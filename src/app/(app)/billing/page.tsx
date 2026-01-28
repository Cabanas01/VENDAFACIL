'use client';

import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/auth-provider';
import { useAccess } from '@/hooks/use-entitlements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, XCircle, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CHECKOUT_LINKS } from '@/lib/billing/checkoutLinks';
import type { PlanType } from '@/lib/billing/checkoutLinks';
import { useAnalytics } from '@/lib/analytics/track';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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

    if (accessStatus.plano_nome === 'Sem Plano') {
         return {
            icon: <XCircle className="h-5 w-5 text-destructive" />,
            text: 'Sem Plano Ativo',
            badgeVariant: 'destructive' as const,
            description: accessStatus.mensagem,
            planName: 'Nenhum'
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
  const { registerUniqueClick } = useAnalytics();
  const { toast } = useToast();
  const router = useRouter();

  const handleCheckout = (plan: PlanType) => {
    const provider = 'hotmart';
    const url = CHECKOUT_LINKS[provider]?.[plan];
    
    if (!url) {
        toast({
            variant: 'destructive',
            title: 'Link de Checkout Indisponível',
            description: 'O link para este plano ainda não foi configurado.'
        });
        return;
    }

    registerUniqueClick(`billing_checkout_${provider}_${plan}`, {
        provider,
        plan,
        source: 'billing_page',
    });

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="font-bold text-lg">{statusInfo.planName}</div>
                <Badge variant={statusInfo.badgeVariant} className="flex items-center gap-2">
                    {statusInfo.icon}
                    <span>{statusInfo.text}</span>
                </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{statusInfo.description}</p>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Nossos Planos</CardTitle>
                <CardDescription>Escolha um dos planos abaixo para renovar ou iniciar sua assinatura. O pagamento é processado via Hotmart.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Semanal</CardTitle>
                            <CardDescription>Acesso por 7 dias.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">R$29</p>
                        </CardContent>
                        <CardContent>
                            <Button className="w-full" onClick={() => handleCheckout('weekly')}>
                                <ShoppingCart className="mr-2 h-4 w-4" /> Continuar
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="border-primary">
                        <CardHeader>
                            <CardTitle>Mensal</CardTitle>
                            <CardDescription>O mais popular. Acesso por 30 dias.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">R$97</p>
                        </CardContent>
                        <CardContent>
                            <Button className="w-full" onClick={() => handleCheckout('monthly')}>
                                <ShoppingCart className="mr-2 h-4 w-4" /> Continuar
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Anual</CardTitle>
                            <CardDescription>O melhor custo-benefício. Acesso por 365 dias.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">R$297</p>
                        </CardContent>
                        <CardContent>
                            <Button className="w-full" onClick={() => handleCheckout('yearly')}>
                                <ShoppingCart className="mr-2 h-4 w-4" /> Continuar
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
