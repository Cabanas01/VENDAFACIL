'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, storeStatus, accessStatus, fetchStoreData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 1. Não autenticado -> Login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Autenticado mas sem loja -> Onboarding
    // Só redireciona se tivermos certeza absoluta (status 'none')
    if (storeStatus === 'none' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 3. Redirecionar do onboarding se já tem loja (status 'has')
    if (storeStatus === 'has' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 4. Paywall: Acesso Bloqueado -> Billing (exceto se for rota segura)
    const isAccessBlocked = accessStatus && !accessStatus.acesso_liberado;
    const isSafePath = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding';
    
    if (storeStatus === 'has' && isAccessBlocked && !isSafePath) {
      router.replace('/billing');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  // REGRA DE OURO: Bloquear qualquer renderização enquanto estiver carregando ou status for desconhecido.
  // Isso evita que o formulário de onboarding apareça prematuramente para quem já tem loja.
  if (loading || storeStatus === 'unknown' || storeStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          {storeStatus === 'loading' ? 'Verificando sua loja...' : 'Carregando sessão...'}
        </p>
      </div>
    );
  }

  // Tratamento de Erro Crítico (Instabilidade no Supabase)
  if (storeStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
        <div className="space-y-2">
            <h1 className="text-2xl font-bold text-destructive">Erro de Conexão</h1>
            <p className="text-muted-foreground max-w-md">
                Não conseguimos validar os dados da sua loja no momento. Por favor, tente atualizar a página.
            </p>
        </div>
        <Button onClick={() => user && fetchStoreData(user.id)} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
        </Button>
      </div>
    );
  }

  // Se for Onboarding, renderiza sem sidebar
  if (pathname === '/onboarding') {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center w-full">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    );
  }

  // Fallback de segurança para redirecionamento
  if (!user || storeStatus === 'none') return null;

  // App Principal
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
