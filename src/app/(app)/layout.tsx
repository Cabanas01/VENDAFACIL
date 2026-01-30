'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';

/**
 * AppLayout (Guardião Único)
 * Centraliza 100% da lógica de proteção de rotas e navegação.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, storeStatus, accessStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Aguarda carregar sessão
    if (loading) return;

    // 2. Se não estiver logado, vai para login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 3. Se logado mas sem loja, vai para onboarding
    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 4. Se já tem loja, não pode ficar no onboarding
    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 5. Paywall: se acesso bloqueado, vai para billing (exceto se já estiver lá ou em settings)
    if (accessStatus && !accessStatus.acesso_liberado && pathname !== '/billing' && pathname !== '/settings') {
      router.replace('/billing?reason=expired');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  // Exibe loading enquanto resolve a identidade
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Sincronizando...</p>
      </div>
    );
  }

  // Se não houver usuário, bloqueia renderização (o useEffect redirecionará)
  if (!user) return null;

  // Renderiza Onboarding sem Sidebar
  if (pathname === '/onboarding') {
    return <main className="min-h-screen p-4 flex items-center justify-center">{children}</main>;
  }

  // Renderiza aplicação padrão
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
