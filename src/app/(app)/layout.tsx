'use client';

/**
 * @fileOverview AppLayout (O ÚNICO Guardião de Navegação)
 * 
 * Centraliza toda a inteligência de fluxo do SaaS. 
 * Respeita a premissa de AuthProvider passivo e máquina de estados oficial.
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
    // 1. Aguardar sincronização inicial (Auth e Store)
    if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
      return;
    }

    // 2. Barreira de Autenticação: Sem usuário vai para o Login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 3. Barreira de Tenant (Loja):
    // Se não tem loja, deve ir para Onboarding (exceto se já estiver lá ou for admin)
    if (storeStatus === 'no_store' && pathname !== '/onboarding' && !isAdminPath) {
      router.replace('/onboarding');
      return;
    }

    // Se já tem loja, nunca deve ver a página de Onboarding
    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 4. Barreira de Acesso (Paywall):
    // Se tem loja mas o acesso não está liberado (expirado ou sem plano)
    if (storeStatus === 'has_store') {
      const isLiberado = accessStatus?.acesso_liberado ?? false;
      
      // Rotas que não sofrem bloqueio de paywall (onde o usuário resolve o problema)
      const isSafePath = pathname === '/billing' || pathname === '/settings' || isAdminPath;

      if (!isLiberado && !isSafePath) {
        console.log('[APP LAYOUT] Acesso bloqueado. Redirecionando para faturamento.');
        router.replace('/billing');
        return;
      }
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router, isAdminPath]);

  // RENDER: Estados de Carregamento (Previne flashes)
  if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          Sincronizando sua conta...
        </p>
      </div>
    );
  }

  // RENDER: Erro de Sincronização (RLS, Rede, Permissão)
  if (storeStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-xl font-bold mb-2">Falha na Comunicação</h1>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Ocorreu um erro ao carregar os dados da sua loja. Isso pode ser instabilidade na conexão ou permissão de acesso.
        </p>
        <Button onClick={() => user && fetchStoreData(user.id)} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Reconectar
        </Button>
      </div>
    );
  }

  // RENDER: Fluxo de Onboarding (Sem Sidebars)
  if (pathname === '/onboarding') {
    return <main className="min-h-screen p-4 flex items-center justify-center bg-muted/5">{children}</main>;
  }

  // RENDER: Dashboard e Aplicação (Fluxo Normal)
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
