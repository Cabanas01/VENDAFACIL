'use client';

/**
 * @fileOverview Página de Planos (Sincronizada e Segura)
 * 
 * Implementa proteção de hidratação e formatação defensiva de datas.
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Loader2, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PLANS_CONFIG, CHECKOUT_LINKS } from '@/lib/billing/checkoutLinks';
import type { PlanID } from '@/lib/billing/checkoutLinks';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BillingPage() {
  const { user, store, accessStatus, refreshStatus, storeStatus } = useAuth();
  const { toast } = useToast();
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Formatação segura de data para evitar exceções de cliente
  const formattedExpiryDate = useMemo(() => {
    if (!accessStatus?.data_fim_acesso) return null;
    try {
      const date = parseISO(accessStatus.data_fim_acesso);
      if (!isValid(date)) return null;
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return null;
    }
  }, [accessStatus?.data_fim_acesso]);

  if (!isMounted || storeStatus === 'loading_auth' || storeStatus === 'loading_status') {
    return (
      <div className="max-w-6xl mx-auto space-y-12 py-8 animate-pulse">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96 w-full" />)}
        </div>
      </div>
    );
  }

  const planOrder: PlanID[] = ['trial', 'semanal', 'mensal', 'anual'];

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight font-headline text-primary uppercase">Plano e Assinatura</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
          Escolha como quer impulsionar o seu negócio. Teste grátis ou escolha um plano profissional.
        </p>
      </div>

      <Card className="border-primary/10 bg-muted/30 shadow-sm overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="flex items-center gap-2 text-sm uppercase font-black tracking-widest">
            <ShieldCheck className="h-4 w-4 text-primary" /> Situação do seu Acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {accessStatus ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-background rounded-xl border border-primary/10">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <span className="text-3xl font-black uppercase tracking-tighter">{accessStatus?.plano_nome || 'Sem Plano'}</span>
                  <Badge variant={accessStatus?.acesso_liberado ? 'default' : 'destructive'} className="font-black text-[10px] uppercase h-5">
                    {accessStatus?.acesso_liberado ? 'Ativo' : 'Bloqueado'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-bold italic opacity-80">{accessStatus?.mensagem}</p>
              </div>

              {formattedExpiryDate && (
                <div className="flex items-center gap-4 px-6 py-4 bg-muted/50 rounded-xl border border-primary/5">
                  <Calendar className="h-6 w-6 text-primary/60" />
                  <div>
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-0.5">Válido até</p>
                    <p className="font-black text-foreground text-lg">
                      {formattedExpiryDate}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center border-dashed border-2 rounded-xl">
              <Info className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground font-medium">Informações de acesso não localizadas.</p>
            </div>
          )}
          
          {accessStatus && !accessStatus?.acesso_liberado && (
            <div className="mt-4 flex items-center gap-2 text-[10px] text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100 font-black uppercase tracking-widest">
              <AlertTriangle className="h-3 w-3" />
              Aguardando confirmação bancária. A tela atualizará automaticamente em segundos.
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
          const isCurrent = accessStatus?.plano_tipo === planId && accessStatus?.acesso_liberado;

          return (
            <Card key={planId} className={cn(
              "flex flex-col relative transition-all duration-300 border-primary/5",
              isPopular && "border-primary shadow-2xl scale-105 z-10",
              isCurrent && "border-green-500 bg-green-50/5 ring-1 ring-green-500/20"
            )}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                  Mais Popular
                </div>
              )}

              <CardHeader className="text-center pb-8 border-b border-primary/5">
                <CardTitle className="text-xl font-headline font-black uppercase tracking-tighter">{plan.name}</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-8 pt-8 px-6">
                <div className="text-center">
                  <span className="text-4xl font-black tracking-tighter">{plan.price}</span>
                  <span className="text-muted-foreground text-[10px] font-black uppercase ml-1 opacity-60">/{plan.periodicity}</span>
                </div>
                <ul className="space-y-4">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground font-bold">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> 
                      <span className="leading-tight">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6 px-6 pb-8 border-t border-primary/5">
                {isTrial ? (
                  <Button 
                    className="w-full h-12 font-black uppercase text-[11px] tracking-widest" 
                    variant="outline"
                    onClick={handleStartTrial}
                    disabled={isStartingTrial || !!store?.trial_used || !!isCurrent}
                  >
                    {isStartingTrial ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      store?.trial_used ? 'Avaliação Utilizada' : 'Testar 7 Dias Grátis'
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-12 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/10" 
                    variant={isPopular ? 'default' : 'secondary'}
                    onClick={() => handleCheckout(planId)}
                    disabled={!!isCurrent}
                  >
                    {isCurrent ? 'Plano Ativo' : 'Assinar Agora'}
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
