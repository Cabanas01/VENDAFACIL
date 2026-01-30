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
 * Centraliza 100% da lógica de proteção de rotas e navegação reativa.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, storeStatus, accessStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Aguarda resolver a autenticação básica
    if (loading) return;

    // 2. Se não houver usuário, vai para o login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 3. Logado mas sem loja configurada? Vai para Onboarding
    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 4. Já tem loja? Não pode ficar no onboarding
    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 5. Verificação de Paywall (somente se não estiver em Billing ou Settings)
    if (accessStatus && !accessStatus.acesso_liberado && pathname !== '/billing' && pathname !== '/settings') {
      router.replace('/billing?reason=expired');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  // Tela de carregamento enquanto a sessão inicial é verificada
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Autenticando...</p>
      </div>
    );
  }

  // Se não houver usuário, o useEffect cuidará do redirecionamento
  if (!user) return null;

  // Onboarding renderiza sem Sidebar para foco total
  if (pathname === '/onboarding') {
    return <main className="min-h-screen p-4 flex items-center justify-center bg-background">{children}</main>;
  }

  // Layout padrão da aplicação com Sidebar
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
