'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, storeStatus, accessStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 🚨 REGRA DE OURO: O AppLayout é o único lugar que decide redirecionamentos de proteção.
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

    // Fluxo de Billing (Paywall)
    const isPaywallExempt = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding';
    if (storeStatus === 'has' && accessStatus && !accessStatus.acesso_liberado && !isPaywallExempt) {
      router.replace('/billing');
      return;
    }
  }, [isLoading, isAuthenticated, storeStatus, accessStatus, pathname, router]);

  // Tela de Carregamento Universal (Previne loops e flashes de conteúdo)
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Sincronizando sua sessão...</p>
      </div>
    );
  }

  // Se não estiver autenticado, o useEffect acima fará o router.replace. 
  // Não renderizamos nada para evitar que o usuário veja conteúdo protegido por 1 frame.
  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainNav />
        <SidebarInset>
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
