'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { useAnalytics } from '@/lib/analytics/track';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PLANS_CONFIG, CHECKOUT_LINKS } from '@/lib/billing/checkoutLinks';
import type { PlanID } from '@/lib/billing/checkoutLinks';


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

    if (accessStatus.plano_nome === 'Sem Plano' || accessStatus.plano_nome === 'Trial Expirado') {
         return {
            icon: <Info className="h-5 w-5 text-blue-500" />,
            text: accessStatus.plano_nome,
            badgeVariant: 'secondary' as const,
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
  const { user, store, accessStatus, isLoading, fetchStoreData } = useAuth();
  const { trackReportOpened, registerUniqueClick } = useAnalytics();
  const { toast } = useToast();
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  
  useEffect(() => {
    trackReportOpened('billing_page');
  }, [trackReportOpened]);


  const handleCheckout = (planId: PlanID) => {
    if (!store || !user) {
        toast({
            variant: 'destructive',
            title: 'Erro de Autenticação',
            description: 'Não foi possível identificar seu usuário ou loja. Por favor, faça login novamente.'
        });
        return;
    }
    
    registerUniqueClick(`billing_plan_select_${planId}`);

    const provider = 'hotmart';
    const url = CHECKOUT_LINKS[provider]?.[planId];
    
    if (!url) {
        toast({
            variant: 'destructive',
            title: 'Link de Checkout Indisponível',
            description: `O link para o plano ${PLANS_CONFIG[planId].name} com ${provider} não foi configurado.`
        });
        return;
    }

    const externalReference = `${store.id}|${planId}|${user.id}`;
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}external_reference=${encodeURIComponent(externalReference)}`;

    registerUniqueClick(`billing_checkout_${provider}_${planId}`, {
        provider: provider,
        plan: planId,
        source: 'billing_page',
    });

    const link = document.createElement('a');
    link.href = finalUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
        const response = await fetch('/api/billing/start-trial', { method: 'POST' });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Ocorreu um erro desconhecido.');
        }

        toast({
            title: 'Avaliação iniciada!',
            description: 'Você agora tem 7 dias de acesso gratuito.',
        });
        // Refresh all auth data, including accessStatus and trial status
        if(user) {
            await fetchStoreData(user.id);
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Não foi possível iniciar a avaliação',
            description: error.message,
        });
    } finally {
        setIsStartingTrial(false);
    }
};

  if (isLoading || !store) {
    return (
        <div className="p-8">
            <Skeleton className="h-10 w-1/3 mb-8" />
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  const statusInfo = getStatusInfo(accessStatus);
  const planOrder: PlanID[] = ['free', 'weekly', 'monthly', 'yearly'];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Nossos Planos</h1>
            <p className="mt-4 text-lg text-muted-foreground">Escolha o plano ideal para o seu negócio e comece a vender mais e melhor.</p>
        </div>
      
        <div className="grid gap-8 md:grid-cols-1 mb-12">
            <Card>
                <CardHeader>
                    <CardTitle>Situação do seu Acesso</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="mb-2 sm:mb-0">
                            <p className="font-bold text-lg">{statusInfo.planName}</p>
                            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
                        </div>
                        <Badge variant={statusInfo.badgeVariant} className="flex items-center gap-2 text-sm px-3 py-1">
                            {statusInfo.icon}
                            <span>{statusInfo.text}</span>
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {planOrder.map(planId => {
                const plan = PLANS_CONFIG[planId];
                if (!plan) return null;
                
                if (plan.isFree) {
                    return (
                        <Card key={planId} className="flex flex-col">
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                                <div className="mb-6">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className="text-muted-foreground">/{plan.periodicity}</span>
                                </div>
                                <ul className="space-y-3 text-muted-foreground">
                                    {plan.benefits.map((benefit, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>{benefit}</span>
                                        </li>
                                    ))}
                                    <li className="flex items-center gap-2 text-yellow-500 pt-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Limite de 10 clientes</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-yellow-500">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Limite de 5 vendas</span>
                                    </li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    className="w-full" 
                                    size="lg" 
                                    variant={'secondary'}
                                    onClick={handleStartTrial}
                                    disabled={store.trial_used || isStartingTrial}
                                >
                                    {isStartingTrial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {store.trial_used ? 'Avaliação já utilizada' : 'Começar avaliação'}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                }
                
                const isRecommended = planId === 'yearly';

                return (
                    <Card key={planId} className={cn(
                        "flex flex-col",
                        isRecommended ? 'border-primary border-2 shadow-lg' : ''
                    )}>
                        {isRecommended && (
                            <div className="py-1 px-4 bg-primary text-primary-foreground text-center text-sm font-semibold rounded-t-lg">
                                Mais Popular
                            </div>
                        )}
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                            <div className="mb-6">
                                <span className="text-4xl font-bold">{plan.price}</span>
                                <span className="text-muted-foreground">/{plan.periodicity}</span>
                            </div>
                            <ul className="space-y-3 text-muted-foreground">
                                {plan.benefits.map((benefit, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                className="w-full" 
                                size="lg" 
                                variant={isRecommended ? 'default' : 'secondary'}
                                onClick={() => handleCheckout(planId)}
                            >
                                Assinar Agora
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
        
        <div className="mt-12 flex flex-col items-center gap-6">
            <div className="text-center text-muted-foreground text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span>Pagamento seguro via Hotmart. Você pode cancelar quando quiser.</span>
            </div>
        </div>

    </div>
  );
}
