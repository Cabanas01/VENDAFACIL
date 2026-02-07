'use client';

/**
 * @fileOverview Página de Planos.
 * Blindada contra erros de acesso e com reatividade pós-trial.
 */

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Loader2, 
  Calendar,
  CheckCircle2,
  Info,
  ArrowRight
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
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function BillingPage() {
  const { user, store, accessStatus, refreshStatus, storeStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleStartTrial = async () => {
    try {
      setIsStartingTrial(true);
      const { error } = await supabase.rpc('start_trial');

      if (error) throw error;

      toast({ 
        title: 'Avaliação Ativada!', 
        description: 'Você agora tem 7 dias de acesso completo ao sistema.' 
      });
      
      await refreshStatus();
      router.refresh(); 
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Falha ao ativar', 
        description: error.message 
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleCheckout = (planId: PlanID) => {
    if (!store || !user) return;
    const url = CHECKOUT_LINKS.hotmart[planId as keyof typeof CHECKOUT_LINKS.hotmart];
    if (!url) {
        toast({ variant: 'destructive', title: 'Checkout Indisponível' });
        return;
    }

    const externalReference = `${store.id}|${planId}|${user.id}`;
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}external_reference=${encodeURIComponent(externalReference)}`;
    window.open(finalUrl, '_blank');
  };

  if (!isMounted || storeStatus === 'loading_auth' || storeStatus === 'loading_status') {
    return (
      <div className="max-w-6xl mx-auto space-y-8 py-8">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const planOrder: PlanID[] = ['trial', 'semanal', 'mensal', 'anual'];

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight font-headline text-primary uppercase">Plano e Assinatura</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
          Profissionalize sua gestão hoje mesmo.
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
                <p className="text-3xl font-black uppercase tracking-tighter">
                  {accessStatus.status === 'trial' ? 'Avaliação Gratuita' : accessStatus.plano_nome}
                </p>
                <p className="text-sm text-muted-foreground font-bold italic">{accessStatus.mensagem}</p>
              </div>

              {accessStatus.expires_at && (
                <div className="flex items-center gap-4 px-6 py-4 bg-muted/50 rounded-xl">
                  <Calendar className="h-6 w-6 text-primary/60" />
                  <div>
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Válido até</p>
                    <p className="font-black text-foreground text-lg">
                      {isValid(parseISO(accessStatus.expires_at)) 
                        ? format(parseISO(accessStatus.expires_at), 'dd/MM/yyyy', { locale: ptBR }) 
                        : '---'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center border-dashed border-2 rounded-xl">
              <Info className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-sm text-muted-foreground font-black uppercase tracking-widest">
                Nenhuma assinatura ativa ou teste iniciado.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {planOrder.map(planId => {
          const plan = PLANS_CONFIG[planId];
          const isTrial = planId === 'trial';
          const isActivePlan = accessStatus?.plano_tipo === planId && accessStatus?.acesso_liberado;

          return (
            <Card key={planId} className={cn(
              "flex flex-col relative transition-all border-primary/5",
              planId === 'anual' && "border-primary shadow-xl scale-105 z-10",
              isActivePlan && "ring-2 ring-green-500"
            )}>
              <CardHeader className="text-center">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">{plan.name}</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6 pt-4">
                <div className="text-center">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-muted-foreground text-[10px] font-black uppercase ml-1">/{plan.periodicity}</span>
                </div>
                <ul className="space-y-3">
                  {(plan.benefits || []).map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs font-bold text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isTrial ? (
                  <Button 
                    className="w-full h-12 font-black uppercase text-[11px]" 
                    variant="outline"
                    onClick={handleStartTrial}
                    disabled={isStartingTrial || !!store?.trial_used || !!accessStatus}
                  >
                    {isStartingTrial ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar 7 Dias'}
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-12 font-black uppercase text-[11px]"
                    onClick={() => handleCheckout(planId)}
                    disabled={isActivePlan}
                  >
                    {isActivePlan ? 'Plano Ativo' : 'Assinar Agora'}
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
