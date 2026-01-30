'use client';

/**
 * @fileOverview AppLayout (O Guardião Único)
 * 
 * Este componente é o único autorizado a executar redirecionamentos (REGRA DE OURO).
 * Ele observa a máquina de estados do AuthProvider e decide o destino do usuário.
 * Também gerencia a alternância entre a Sidebar da Loja e a Sidebar do Admin.
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { AdminSidebar } from '@/components/admin-sidebar';
import { Loader2, AlertTriangle, RefreshCcw, TrendingUp, ShieldCheck, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getPlanLabel } from '@/lib/plan-label';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, storeStatus, store, accessStatus, products, sales, fetchStoreData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdminPath = pathname.startsWith('/admin');

  /**
   * MECANISMO DE GUARDIÃO ÚNICO
   * Decisões de navegação centralizadas e determinísticas.
   */
  useEffect(() => {
    if (loading) return;

    // 1. Bloqueio por falta de sessão
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Aguardar estados terminais conclusivos
    if (storeStatus === 'loading_auth' || storeStatus === 'loading_store') return;

    // 3. Gestão de Tenant (Onboarding)
    // Administradores podem acessar rotas /admin mesmo sem loja vinculada
    if (storeStatus === 'no_store' && pathname !== '/onboarding' && !isAdminPath) {
      router.replace('/onboarding');
      return;
    }

    // 4. Impedir Onboarding se a loja já existe
    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 5. Paywall (Acesso Liberado)
    // Bloqueia acesso operacional se acesso_liberado for falso
    const isLiberado = accessStatus?.acesso_liberado ?? false;
    const isSafePath = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding' || isAdminPath;

    if (storeStatus === 'has_store' && !isLiberado && !isSafePath) {
      router.replace('/billing');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router, isAdminPath]);

  /**
   * Cálculo Reativo de CMV % (Saúde Financeira)
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
   * RENDERS DE ESTADO (BLOQUEADORES)
   */

  // Estado: Sincronizando
  if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          {storeStatus === 'loading_store' ? 'Sincronizando dados da sua loja...' : 'Validando sua sessão...'}
        </p>
      </div>
    );
  }

  // Estado: Erro Técnico (RLS/Rede)
  if (storeStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Erro de Sincronização</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          Não conseguimos carregar os dados. Isso pode ser instabilidade de rede ou erro de permissão (RLS).
        </p>
        <div className="flex gap-3">
          <Button onClick={() => user && fetchStoreData(user.id)} variant="default">
            <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Recarregar Página
          </Button>
        </div>
      </div>
    );
  }

  // Estado: Onboarding (Sem Sidebar)
  if (pathname === '/onboarding') {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center w-full">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    );
  }

  /**
   * RENDER DA APLICAÇÃO (DASHBOARD / ADMIN)
   */
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        {isAdminPath ? <AdminSidebar /> : <MainNav />}
        <SidebarInset>
          {/* Header Global Unificado */}
          <header className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6 ${isAdminPath ? 'bg-primary/5 border-primary/10' : 'bg-background'}`}>
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold font-headline truncate max-w-[200px] md:max-w-md">
                  {isAdminPath ? 'Painel Administrativo' : store?.name}
                </h1>
                
                <div className="flex items-center gap-2">
                  {isAdminPath ? (
                    <Badge variant="default" className="text-[10px] h-5 py-0 px-2 font-bold bg-primary">
                      <ShieldCheck className="h-3 w-3 mr-1" /> SaaS ROOT
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-[10px] h-5 py-0 px-2 font-medium bg-muted/50">
                        <ShieldCheck className="h-3 w-3 mr-1 text-primary" />
                        Plano {getPlanLabel(accessStatus?.plano_tipo)}
                      </Badge>
                      <Badge variant={accessStatus?.acesso_liberado ? "default" : "destructive"} className="text-[10px] h-5 py-0 px-2">
                        {accessStatus?.acesso_liberado ? 'Ativo' : 'Acesso Bloqueado'}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              
              {isAdminPath ? (
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">SaaS Monitor</span>
                  <div className="flex items-center gap-1.5 text-primary">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-bold">Online</span>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Saúde Financeira</span>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className={`h-4 w-4 ${cmvPercentage > 40 ? 'text-destructive' : 'text-green-500'}`} />
                    <span className="text-sm font-bold">CMV {cmvPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </header>

          <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/5">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
