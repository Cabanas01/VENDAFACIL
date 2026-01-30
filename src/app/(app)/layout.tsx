'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * AppLayout (Guardião Único)
 * Único responsável por redirecionamentos.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, storeStatus, accessStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 1. Não logado -> Login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Logado sem loja -> Onboarding
    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 3. Logado com loja tentando acessar onboarding -> Dashboard
    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 4. Paywall
    if (accessStatus && !accessStatus.acesso_liberado && pathname !== '/billing' && pathname !== '/settings') {
      router.replace('/billing?reason=expired');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="mb-4 animate-pulse">
          <Avatar className="h-16 w-16 rounded-lg">
            <AvatarImage src="/logo.png" alt="Logo" />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">VF</AvatarFallback>
          </Avatar>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">Validando sua sessão...</p>
      </div>
    );
  }

  // Se não houver usuário, useEffect fará o redirect. Não renderizamos nada para evitar flash de UI.
  if (!user) return null;

  if (pathname === '/onboarding') {
    return <main className="min-h-screen p-4 flex items-center justify-center bg-background">{children}</main>;
  }

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
