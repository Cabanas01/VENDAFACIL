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
 * Único lugar responsável por decidir redirecionamentos de autenticação e paywall.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, storeStatus, accessStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Só toma decisões após o AuthProvider carregar a sessão inicial
    if (loading) return;

    // 1. Proteção Básica: Se não estiver logado, vai para /login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Fluxo de Onboarding: Se logado mas sem loja, obriga /onboarding
    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 3. Bloqueio de Onboarding: Se já tem loja, não pode acessar onboarding
    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 4. Paywall: Se acesso expirado, bloqueia tudo exceto Billing e Settings
    if (accessStatus && !accessStatus.acesso_liberado && pathname !== '/billing' && pathname !== '/settings') {
      router.replace('/billing?reason=expired');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  // Enquanto carrega a identidade, mostra tela neutra de loading
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Verificando acesso...</p>
      </div>
    );
  }

  // Se não estiver logado, não renderiza nada (o useEffect fará o redirect)
  if (!user) return null;

  // Onboarding renderiza sem Sidebar para foco total no cadastro
  if (pathname === '/onboarding') {
    return <main className="min-h-screen p-4 flex items-center justify-center bg-background">{children}</main>;
  }

  // Layout Padrão da Aplicação
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
