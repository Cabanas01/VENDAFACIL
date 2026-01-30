'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, store, isLoading, storeStatus, storeError, logout, accessStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Só redireciona se tivermos certeza do estado de autenticação
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Fluxo de Onboarding
    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }
    
    // Verificação de Pagamento/Plano
    // Aguardamos o accessStatus carregar antes de redirecionar para o billing
    if (storeStatus === 'has' && accessStatus && !accessStatus.acesso_liberado && pathname !== '/billing' && pathname !== '/settings') {
        router.replace('/billing?reason=expired');
    }

  }, [isLoading, isAuthenticated, storeStatus, pathname, router, accessStatus]);

  // Enquanto verifica a identidade (Supabase Auth)
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  // Se não estiver logado, não renderiza nada (o useEffect redirecionará)
  if (!isAuthenticated) return null;

  // Se estiver carregando os dados da loja, mostra o esqueleto do dashboard
  if (storeStatus === 'loading' || storeStatus === 'unknown') {
    return (
      <div className="flex min-h-screen w-full">
        <div className="hidden w-64 border-r bg-background p-4 md:block">
          <Skeleton className="h-12 w-full mb-8" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  if (storeStatus === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-destructive">Erro de Conexão</h1>
        <p className="text-sm text-muted-foreground">{storeError || 'Não foi possível carregar os dados da sua loja.'}</p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Recarregar Página</Button>
          <Button variant="outline" onClick={logout}>Sair</Button>
        </div>
      </div>
    );
  }
  
  // Caso esteja em onboarding, renderiza sem a sidebar
  if (pathname === '/onboarding') {
    return <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">{children}</div>;
  }

  // Previne renderizar conteúdo protegido se a loja ainda não estiver carregada
  if (!store && storeStatus === 'has') return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainNav />
        <SidebarInset>
          <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
