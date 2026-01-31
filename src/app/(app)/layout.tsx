'use client';

/**
 * @fileOverview AppLayout (Guardião Determinístico)
 * 
 * Implementação fiel da tela de erro "Falha na Comunicação" solicitada pelo usuário.
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
  const { user, loading, storeStatus, accessStatus, fetchStoreData, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdminPath = pathname.startsWith('/admin');

  useEffect(() => {
    if (loading || storeStatus === 'loading_auth') return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (storeStatus === 'loading_store') return;

    if (storeStatus === 'no_store' && pathname !== '/onboarding' && !isAdminPath) {
      router.replace('/onboarding');
      return;
    }

    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    if (storeStatus === 'has_store') {
      const isLiberado = accessStatus?.acesso_liberado ?? false;
      const isSafePath = pathname === '/billing' || pathname === '/settings' || isAdminPath;

      if (!isLiberado && !isSafePath) {
        router.replace('/billing');
        return;
      }
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router, isAdminPath]);

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

  // RENDER: Falha na Comunicação (Representação fiel da imagem fornecida pelo usuário)
  if (storeStatus === 'error') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#fcfcfc] p-6">
        <div className="max-w-md w-full flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <AlertTriangle className="h-10 w-10 text-red-500 stroke-[1.5]" />
          </div>
          
          <h1 className="text-2xl font-headline font-bold text-slate-900 mb-4">
            Falha na Comunicação
          </h1>
          
          <div className="text-slate-500 text-base mb-10 leading-relaxed px-4">
            Ocorreu um erro ao carregar os dados da sua loja. <br className="hidden sm:block" />
            Isso pode ser instabilidade na conexão ou permissão de acesso.
          </div>
          
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <Button 
              onClick={() => user && fetchStoreData(user.id)} 
              className="h-12 px-8 font-semibold gap-2 shadow-sm bg-primary hover:bg-primary/90 transition-all active:scale-95"
            >
              <RefreshCcw className="h-4 w-4" />
              Tentar Reconectar
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => logout()}
              className="text-slate-400 hover:text-slate-600"
            >
              Sair da conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pathname === '/onboarding') {
    return <main className="min-h-screen flex items-center justify-center bg-muted/5">{children}</main>;
  }

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
