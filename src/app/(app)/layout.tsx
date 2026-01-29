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
  const { isAuthenticated, store, loading, storeStatus, storeError, logout, accessStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }
    
    // Paywall logic
    if (accessStatus && !accessStatus.acesso_liberado && pathname !== '/billing' && pathname !== '/settings') {
        router.replace('/billing?reason=expired');
    }

  }, [loading, isAuthenticated, storeStatus, store, pathname, router, accessStatus]);

  if (loading || (isAuthenticated && (storeStatus === 'loading' || storeStatus === 'unknown'))) {
    return (
      <div className="flex min-h-screen w-full">
        <div className="hidden w-64 border-r bg-background p-4 md:block">
          <Skeleton className="h-12 w-full mb-8" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
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
        <h1 className="text-2xl font-semibold">Ocorreu um erro na aplicação</h1>
        <p className="text-sm text-muted-foreground">
          Sua sessão está ativa, mas o app não conseguiu carregar os dados da loja. Isso pode ser um problema com as permissões no Supabase (RLS/policies) ou de conexão.
        </p>
        {storeError ? (
          <pre className="w-full overflow-auto rounded-md border bg-muted p-3 text-left text-xs">{storeError}</pre>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => router.push('/onboarding')}>
            Tentar ir para Onboarding
          </Button>
          <Button variant="outline" onClick={() => logout()}>
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  // While redirecting, don't render children to avoid flashes of wrong content
  const isRedirecting = !isAuthenticated ||
                        (storeStatus === 'none' && pathname !== '/onboarding') ||
                        (storeStatus === 'has' && pathname === '/onboarding') ||
                        (accessStatus && !accessStatus.acesso_liberado && pathname !== '/billing' && pathname !== '/settings');


  if (isRedirecting) {
    return null; // Render nothing while redirecting
  }
  
  if (!store && pathname !== '/onboarding') {
      return null;
  }

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