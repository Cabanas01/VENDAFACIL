'use client';

/**
 * @fileOverview BillingPage (Dumb View)
 * 
 * Exibe planos e status com polling leve para detectar confirmação de pagamento.
 */

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  Calendar,
  AlertTriangle
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
  const { user, store, accessStatus, refreshStatus } = useAuth();
  const { toast } = useToast();
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  // Polling leve para detectar atualização do webhook após pagamento
  useEffect(() => {
    if (!accessStatus?.acesso_liberado) {
      const interval = setInterval(() => {
        refreshStatus();
      }, 30000); // 30 segundos
      return () => clearInterval(interval);
    }
  }, [accessStatus?.acesso_liberado, refreshStatus]);

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      const response = await fetch('/api/billing/start-trial', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Erro ao ativar trial.');

      toast({ title: 'Avaliação Ativada!', description: 'Você tem 7 dias de acesso completo.' });
      await refreshStatus();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Falha ao ativar', description: error.message });
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleCheckout = (planId: PlanID) => {
    if (!store || !user) return;
    const url = CHECKOUT_LINKS.hotmart[planId];
    if (!url) {
        toast({ variant: 'destructive', title: 'Checkout Indisponível' });
        return;
    }

    const externalReference = `${store.id}|${planId}|${user.id}`;
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}external_reference=${encodeURIComponent(externalReference)}`;
    window.open(finalUrl, '_blank');
  };

  const planOrder: PlanID[] = ['trial', 'semanal', 'mensal', 'anual'];

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline text-primary">Plano e Assinatura</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Escolha como quer impulsionar o seu negócio. Teste grátis ou escolha um plano profissional.
        </p>
      </div>

      <Card className="border-primary/20 bg-muted/30 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Situação do seu Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-background rounded-xl border">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-2xl font-black uppercase tracking-tighter">{accessStatus?.plano_nome || 'Sem Plano'}</span>
                <Badge variant={accessStatus?.acesso_liberado ? 'default' : 'destructive'} className="font-black text-[10px] uppercase">
                  {accessStatus?.acesso_liberado ? 'Acesso Liberado' : 'Acesso Bloqueado'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{accessStatus?.mensagem}</p>
            </div>

            {accessStatus?.data_fim_acesso && (
              <div className="flex items-center gap-4 px-6 py-3 bg-muted/50 rounded-lg border border-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Válido até</p>
                  <p className="font-black text-foreground">
                    {format(parseISO(accessStatus.data_fim_acesso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>
          {!accessStatus?.acesso_liberado && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 font-bold uppercase">
              <AlertTriangle className="h-3 w-3" />
              Aguardando confirmação do Hotmart. Esta tela atualizará automaticamente.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {planOrder.map(planId => {
          const plan = PLANS_CONFIG[planId];
          if (!plan) return null;

          const isTrial = planId === 'trial';
          const isPopular = planId === 'anual';
          const isCurrent = accessStatus?.plano_tipo === planId && accessStatus.acesso_liberado;

          return (
            <Card key={planId} className={cn(
              "flex flex-col relative transition-all duration-300 hover:shadow-xl border-border/50",
              isPopular && "border-primary shadow-lg scale-105 z-10",
              isCurrent && "border-green-500 bg-green-50/5 ring-1 ring-green-500/20"
            )}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Mais Popular
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-xl font-headline font-black uppercase tracking-tight">{plan.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 h-8 font-medium">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                <div className="text-center">
                  <span className="text-3xl font-black">{plan.price}</span>
                  <span className="text-muted-foreground text-xs font-bold">/{plan.periodicity}</span>
                </div>
                <ul className="space-y-3">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground font-medium">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> 
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isTrial ? (
                  <Button 
                    className="w-full h-11 font-black uppercase text-[11px] tracking-widest" 
                    variant="outline"
                    onClick={handleStartTrial}
                    disabled={isStartingTrial || store?.trial_used || isCurrent}
                  >
                    {isStartingTrial ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      store?.trial_used ? 'Avaliação Utilizada' : 'Começar 7 dias grátis'
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-11 font-black uppercase text-[11px] tracking-widest shadow-sm" 
                    variant={isPopular ? 'default' : 'secondary'}
                    onClick={() => handleCheckout(planId)}
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Seu Plano Atual' : 'Assinar Agora'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
