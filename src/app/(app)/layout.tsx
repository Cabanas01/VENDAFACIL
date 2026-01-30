'use client';

/**
 * @fileOverview AppLayout (O Guardião Único)
 * 
 * Este componente é o único autorizado a executar redirecionamentos.
 * Ele observa a máquina de estados do AuthProvider e decide o destino do usuário.
 * Também gerencia o Header Global com indicadores de CMV e Plano.
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Loader2, AlertTriangle, RefreshCcw, TrendingUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getPlanLabel } from '@/lib/plan-label';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, storeStatus, store, accessStatus, products, sales, fetchStoreData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 1. Sem user -> Login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Aguardar estados conclusivos da loja
    if (storeStatus === 'loading_auth' || storeStatus === 'loading_store') return;

    // 3. Sem loja -> Onboarding
    if (storeStatus === 'no_store' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 4. Com loja mas no onboarding -> Dashboard
    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 5. Paywall (Se liberado === false e não for rota segura)
    const isLiberado = accessStatus?.acesso_liberado ?? false;
    const isSafePath = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding';

    if (storeStatus === 'has_store' && !isLiberado && !isSafePath) {
      router.replace('/billing');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  /**
   * Cálculo Global do CMV %
   * Baseado no custo atual dos produtos vs faturamento total histórico (conforme dados em cache)
   */
  const cmvPercentage = useMemo(() => {
    if (!sales || sales.length === 0) return 0;
    let totalRevenue = 0;
    let totalCost = 0;

    sales.forEach(sale => {
      totalRevenue += sale.total_cents;
      sale.items?.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        totalCost += (product?.cost_cents ?? 0) * item.quantity;
      });
    });

    return totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;
  }, [sales, products]);

  /**
   * ESTADOS DE RENDERIZAÇÃO
   */

  // Estado 1: Sincronizando (Loader)
  if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return <LoaderScreen message={storeStatus === 'loading_store' ? 'Sincronizando dados da sua loja...' : 'Validando sua sessão...'} />;
  }

  // Estado 2: Falha Técnica (ErrorScreen)
  if (storeStatus === 'error') {
    return <ErrorScreen onRetry={() => user && fetchStoreData(user.id)} />;
  }

  // Estado 3: Onboarding (Sem Sidebar)
  if (pathname === '/onboarding') {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center w-full">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    );
  }

  // Estado 4: Aplicação Principal (Com Sidebar)
  if (storeStatus !== 'has_store') {
    return <LoaderScreen message="Aguardando confirmação do sistema..." />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainNav />
        <SidebarInset>
          {/* Header Global do Dashboard */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold font-headline truncate max-w-[200px] md:max-w-md">
                  {store?.name}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5 py-0 px-2 font-medium bg-muted/50 border-primary/20">
                    <ShieldCheck className="h-3 w-3 mr-1 text-primary" />
                    Plano {getPlanLabel(accessStatus?.plano_tipo)}
                  </Badge>
                  <Badge variant={accessStatus?.acesso_liberado ? "default" : "destructive"} className="text-[10px] h-5 py-0 px-2">
                    {accessStatus?.acesso_liberado ? 'Acesso Ativo' : 'Acesso Bloqueado'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Saúde Financeira</span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={`h-4 w-4 ${cmvPercentage > 40 ? 'text-destructive' : 'text-green-500'}`} />
                  <span className="text-sm font-bold">CMV {cmvPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </header>

          {/* Conteúdo da Página */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/5">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

/**
 * Componentes de Feedback
 */

function LoaderScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse font-medium">{message}</p>
    </div>
  );
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="bg-destructive/10 p-4 rounded-full mb-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Erro de Sincronização</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Não conseguimos validar os dados da sua loja. Isso pode ser instabilidade de rede ou erro de permissão (RLS).
      </p>
      <div className="flex gap-3">
        <Button onClick={onRetry} variant="default">
          <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Recarregar Página
        </Button>
      </div>
    </div>
  );
}
