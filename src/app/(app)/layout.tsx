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
    // Wait until the authentication state is fully loaded before running any logic.
    if (isLoading) return;

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
    
    // Paywall logic: Only redirect if accessStatus is fully loaded and access is not granted.
    if (accessStatus && !accessStatus.acesso_liberado && pathname !== '/billing' && pathname !== '/settings') {
        router.replace('/billing?reason=expired');
    }

  }, [isLoading, isAuthenticated, storeStatus, store, pathname, router, accessStatus]);

  // While the initial session is loading, show a full-page loading screen.
  // This prevents the "flash" of the login page or other incorrect content.
  if (isLoading) {
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
  
  // After loading, if the user is authenticated but doesn't have a store (and isn't on onboarding),
  // they will be redirected by the useEffect. We show a loading state during this brief period.
  if (!store && pathname !== '/onboarding') {
      return (
        <div className="flex min-h-screen w-full items-center justify-center">
          <Skeleton className="h-screen w-screen" />
        </div>
      );
  }

  // Once all checks are passed, render the main app layout.
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
