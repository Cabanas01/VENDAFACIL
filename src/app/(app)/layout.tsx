'use client';

/**
 * @fileOverview AppLayout (O ÚNICO Guardião)
 * 
 * Toda decisão de navegação acontece aqui. 
 * Centraliza logs de diagnóstico e proteção de rotas.
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { AdminSidebar } from '@/components/admin-sidebar';
import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, storeStatus, accessStatus, fetchStoreData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdminPath = pathname.startsWith('/admin');

  // ✅ PROBLEMA 2: Log de diagnóstico para provar o estado do guardião
  useEffect(() => {
    console.log('[APP LAYOUT]', { user: user?.email, storeStatus, pathname });
  }, [user, storeStatus, pathname]);

  useEffect(() => {
    // ✋ REGRA ABSOLUTA: Não decidir enquanto o estado é intermediário
    if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
      return;
    }

    // 1. Falta de Sessão
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Gestão de Tenant (Somente estados terminais decidem)
    if (storeStatus === 'no_store' && pathname !== '/onboarding' && !isAdminPath) {
      router.replace('/onboarding');
      return;
    }

    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 3. Paywall
    const isLiberado = accessStatus?.acesso_liberado ?? false;
    const isSafePath = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding' || isAdminPath;

    if (storeStatus === 'has_store' && !isLiberado && !isSafePath) {
      router.replace('/billing');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router, isAdminPath]);

  // ✅ RENDER DE CARREGAMENTO (Impede flashes de conteúdo errado)
  if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Sincronizando dados do sistema...</p>
      </div>
    );
  }

  // RENDER DE ERRO TÉCNICO (RLS / REDE)
  if (storeStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Erro de Sincronização</h1>
        <p className="text-muted-foreground mb-6">Não conseguimos validar os dados da sua conta no momento.</p>
        <Button onClick={() => user && fetchStoreData(user.id)} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
        </Button>
      </div>
    );
  }

  // No Onboarding não usamos sidebar
  if (pathname === '/onboarding') return <main className="min-h-screen p-4 flex items-center justify-center bg-muted/5">{children}</main>;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        {isAdminPath ? <AdminSidebar /> : <MainNav />}
        <SidebarInset>
          <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/5">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
