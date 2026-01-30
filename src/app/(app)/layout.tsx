'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, storeStatus, accessStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 1. Não autenticado -> Login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Autenticado mas sem loja -> Onboarding (exceto se já estiver lá)
    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 3. Autenticado com loja mas acesso bloqueado -> Billing (exceto se já estiver lá ou em settings)
    const isAccessBlocked = accessStatus && !accessStatus.acesso_liberado;
    const isSafePath = pathname === '/billing' || pathname === '/settings';
    
    if (storeStatus === 'has' && isAccessBlocked && !isSafePath) {
      router.replace('/billing');
      return;
    }

    // 4. Redirecionar do onboarding se já tem loja
    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  // Mostrar Loader enquanto decide o destino
  if (loading || !user || storeStatus === 'unknown' || storeStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Sincronizando acesso...</p>
      </div>
    );
  }

  // Se chegou aqui, o usuário está validado para ver a área logada
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
