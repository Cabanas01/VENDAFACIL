'use client';

/**
 * @fileOverview AppLayout (Guardião Determinístico)
 * 
 * Ordem de Precedência:
 * 1. Loading Inicial -> 2. Login Check -> 3. Store Check -> 4. Access Check -> 5. Render
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

  useEffect(() => {
    // 1. Aguardar sincronização da identidade (JWT)
    if (loading || storeStatus === 'loading_auth') {
      return;
    }

    // 2. Barreira de Autenticação: Sem usuário vai para o Login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 3. Aguardar sincronização dos dados da loja (Tenant)
    if (storeStatus === 'loading_store') {
      return;
    }

    // 4. Barreira de Tenant: Se não tem loja e não é Admin, vai para Onboarding
    if (storeStatus === 'no_store' && pathname !== '/onboarding' && !isAdminPath) {
      router.replace('/onboarding');
      return;
    }

    // Se já tem loja, sai do onboarding
    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 5. Barreira de Acesso (Paywall): Para lojas existentes
    if (storeStatus === 'has_store') {
      const isLiberado = accessStatus?.acesso_liberado ?? false;
      const isSafePath = pathname === '/billing' || pathname === '/settings' || isAdminPath;

      if (!isLiberado && !isSafePath) {
        router.replace('/billing');
        return;
      }
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router, isAdminPath]);

  // RENDER: Estado de Carregamento Crítico
  if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          Sincronizando ambiente seguro...
        </p>
      </div>
    );
  }

  // RENDER: Falha na Comunicação (Conforme Screenshot)
  if (storeStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="bg-destructive/10 p-6 rounded-full mb-6">
          <AlertTriangle className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-3xl font-headline font-bold mb-3 tracking-tight">Falha na Comunicação</h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
          Ocorreu um erro ao carregar os dados da sua loja. Isso pode ser instabilidade na conexão ou permissão de acesso.
        </p>
        <Button 
          onClick={() => user && fetchStoreData(user.id)} 
          size="lg" 
          className="gap-2 px-8 h-12 shadow-lg"
        >
          <RefreshCcw className="h-4 w-4" /> Tentar Reconectar
        </Button>
      </div>
    );
  }

  // Render do Onboarding
  if (pathname === '/onboarding') {
    return <main className="min-h-screen flex items-center justify-center bg-muted/5">{children}</main>;
  }

  // Render da Aplicação Principal
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        {isAdminPath ? <AdminSidebar /> : <MainNav />}
        <SidebarInset className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 bg-muted/5 min-h-full">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
