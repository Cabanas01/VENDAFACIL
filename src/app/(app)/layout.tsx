'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, store, loading, storeStatus, storeError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const redirect = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?redirect=${redirect}`);
      return;
    }

    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    if (storeStatus === 'has' && store && pathname === '/onboarding') {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, store, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full">
        <div className="w-64 border-r p-4">
          <Skeleton className="h-12 w-full mb-8" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

    if (storeStatus === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Permissão do Supabase bloqueando acesso</h1>
        <p className="text-sm text-muted-foreground">
          Sua sessão está ativa, mas o app não conseguiu ler a loja (tabelas <code>stores</code>/<code>store_members</code>).
          Isso geralmente é RLS/policies no Supabase.
        </p>
        {storeError ? (
          <pre className="w-full overflow-auto rounded-md border p-3 text-left text-xs">{storeError}</pre>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <a className="underline" href="/onboarding">Ir para Onboarding</a>
          <a className="underline" href="/login">Voltar ao Login</a>
        </div>
      </div>
    );
  }

// Enquanto redireciona, n찾o renderiza nada
  if (!isAuthenticated) return null;
  if (storeStatus === 'none' && pathname !== '/onboarding') return null;

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
