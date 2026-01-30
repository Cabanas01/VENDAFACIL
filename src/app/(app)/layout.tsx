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

    // 3. Redirecionar do onboarding se já tem loja
    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 4. Paywall: Bloqueado -> Billing (exceto se for rota segura)
    const isAccessBlocked = accessStatus && !accessStatus.acesso_liberado;
    const isSafePath = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding';
    
    if (storeStatus === 'has' && isAccessBlocked && !isSafePath) {
      router.replace('/billing');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  // Mostrar Loader enquanto decide o destino ou carrega sessão inicial
  if (loading || storeStatus === 'unknown' || (user && storeStatus === 'loading' && pathname !== '/onboarding')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          {storeStatus === 'unknown' ? 'Sincronizando acesso...' : 'Carregando dados da loja...'}
        </p>
      </div>
    );
  }

  // Se estiver no onboarding, renderiza apenas o conteúdo (sem sidebar)
  if (pathname === '/onboarding') {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center w-full">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    );
  }

  // Se não houver usuário, o useEffect cuidará do redirecionamento
  if (!user) return null;

  // Área Protegida Padrão
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
