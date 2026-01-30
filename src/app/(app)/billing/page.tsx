'use client';

/**
 * @fileOverview BillingPage (Dumb View)
 * 
 * Exibe os planos e o status do acesso atual.
 * NÃO executa redirecionamentos. Confia no AppLayout para o bloqueio de rotas.
 */

import { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  ShieldCheck, 
  Loader2, 
  CreditCard,
  Calendar,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLANS_CONFIG, CHECKOUT_LINKS } from '@/lib/billing/checkoutLinks';
import type { PlanID } from '@/lib/billing/checkoutLinks';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BillingPage() {
  const { user, store, accessStatus, fetchStoreData } = useAuth();
  const { toast } = useToast();
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  /**
   * Dispara o início do período de 7 dias gratuitos.
   */
  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      const response = await fetch('/api/billing/start-trial', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Erro ao iniciar trial');

      toast({ title: 'Avaliação iniciada!', description: 'Seu acesso foi liberado por 7 dias.' });
      
      // Sincroniza dados globais. O AppLayout detectará a mudança e poderá mudar a rota.
      if (user) await fetchStoreData(user.id);
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível ativar',
        description: error.message,
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  /**
   * Monta o link externo de pagamento com referência para o webhook.
   */
  const handleCheckout = (planId: PlanID) => {
    if (!store || !user) return;

    const url = CHECKOUT_LINKS.hotmart[planId];
    if (!url) {
      toast({ variant: 'destructive', title: 'Checkout indisponível', description: 'Link não configurado para este plano.' });
      return;
    }

    // Referência usada pelo webhook para identificar quem pagou o quê
    const externalReference = `${store.id}|${planId}|${user.id}`;
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}external_reference=${encodeURIComponent(externalReference)}`;

    window.open(finalUrl, '_blank');
  };

  const statusInfo = getAccessStatusDisplay(accessStatus);
  const planOrder: PlanID[] = ['free', 'semanal', 'mensal', 'anual'];

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline">Assinatura e Acesso</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Gerencie seu plano e visualize o status do seu acesso ao sistema VendaFácil.
        </p>
      </div>

      {/* Status Atual */}
      <Card className="border-primary/20 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Situação do seu Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-background rounded-xl border">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-2xl font-bold">{statusInfo.planName}</span>
                <Badge variant={statusInfo.badgeVariant}>{statusInfo.statusText}</Badge>
              </div>
              <p className="text-muted-foreground">{statusInfo.description}</p>
            </div>

            {accessStatus?.data_fim_acesso && (
              <div className="flex items-center gap-4 px-6 py-3 bg-muted rounded-lg border">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Expira em</p>
                  <p className="font-semibold">
                    {format(parseISO(accessStatus.data_fim_acesso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {planOrder.map(planId => {
          const plan = PLANS_CONFIG[planId];
          const isCurrent = accessStatus?.plano_tipo === planId && accessStatus.acesso_liberado;
          const isTrial = planId === 'free';
          const isPopular = planId === 'anual';

          return (
            <Card key={planId} className={cn(
              "flex flex-col relative transition-all duration-300 hover:shadow-xl",
              isPopular && "border-primary shadow-lg scale-105 z-10",
              isCurrent && "border-green-500 bg-green-50/10"
            )}>
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  Melhor Escolha
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-xl font-headline">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                <div className="text-center">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">/{plan.periodicity}</span>
                </div>

                <ul className="space-y-3">
                  {plan.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isTrial ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleStartTrial}
                    disabled={isStartingTrial || store?.trial_used || isCurrent}
                  >
                    {isStartingTrial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {store?.trial_used ? 'Trial já utilizado' : 'Começar 7 dias grátis'}
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant={isPopular ? 'default' : 'secondary'}
                    onClick={() => handleCheckout(planId)}
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Plano Atual' : 'Assinar Agora'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col items-center gap-4 pt-8 text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          Pagamento processado com segurança via Hotmart.
        </div>
        <p className="text-xs text-center max-w-md">
          A liberação do acesso é imediata após a confirmação do pagamento. 
          Em caso de boleto ou PIX, o sistema aguarda a notificação do banco.
        </p>
      </div>
    </div>
  );
}

/**
 * Helper para normalizar as mensagens de status do acesso.
 */
function getAccessStatusDisplay(status: any) {
  if (!status) {
    return {
      planName: 'Verificando...',
      statusText: 'Aguarde',
      badgeVariant: 'secondary' as const,
      description: 'Sincronizando dados de licenciamento...',
    };
  }

  if (status.acesso_liberado) {
    return {
      planName: status.plano_nome,
      statusText: 'Ativo',
      badgeVariant: 'default' as const,
      description: status.mensagem || 'Seu acesso está liberado.',
    };
  }

  return {
    planName: status.plano_nome || 'Sem Plano',
    statusText: 'Bloqueado',
    badgeVariant: 'destructive' as const,
    description: status.mensagem || 'Seu acesso expirou ou não foi encontrado.',
  };
}
