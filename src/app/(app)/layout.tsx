'use client';

/**
 * @fileOverview AppLayout (Guardião Único)
 * Este é o cérebro da navegação. Ele é o único lugar que executa router.replace.
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Loader2, RefreshCcw, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, storeStatus, accessStatus, fetchStoreData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 🚨 REGRA 1: Se a sessão auth ainda está carregando, não fazemos nada.
    if (loading) return;

    // 🚨 REGRA 2: Se não houver usuário autenticado, expulsar para o login.
    if (!user) {
      router.replace('/login');
      return;
    }

    // 🚨 REGRA 3: Se a loja ainda está sendo buscada ou houve erro, não redirecionamos.
    // Aguardamos os estados terminais: 'has_store', 'no_store' ou 'error'.
    if (storeStatus === 'loading_store' || storeStatus === 'unknown') return;

    // 🚨 REGRA 4: SE REALMENTE NÃO TEM LOJA -> Onboarding
    if (storeStatus === 'no_store' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 🚨 REGRA 5: SE TEM LOJA MAS ESTÁ NO ONBOARDING -> Dashboard
    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 🚨 REGRA 6: PAYWALL - Se acesso expirou, vai para Billing (exceto se já estiver lá ou em settings)
    const isAccessBlocked = accessStatus && !accessStatus.acesso_liberado;
    const isSafePath = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding';
    
    if (storeStatus === 'has_store' && isAccessBlocked && !isSafePath) {
      router.replace('/billing');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  /**
   * RENDERIZAÇÃO DE ESTADOS DE CARREGAMENTO (Evita tela branca)
   */

  // 1. Loader de Autenticação / Inicialização
  if (loading || storeStatus === 'unknown' || storeStatus === 'loading_store') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          {storeStatus === 'loading_store' ? 'Sincronizando dados da sua loja...' : 'Validando sua sessão...'}
        </p>
      </div>
    );
  }

  // 2. Interface de Erro de Conexão (RLS ou Supabase Down)
  if (storeStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center gap-6">
        <div className="bg-destructive/10 p-4 rounded-full">
            <AlertOctagon className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
            <h1 className="text-2xl font-bold">Erro de Sincronização</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
                Não conseguimos validar os dados da sua loja. Isso pode ser uma falha de conexão ou permissão de acesso.
            </p>
        </div>
        <div className="flex gap-3">
            <Button onClick={() => user && fetchStoreData(user.id)} variant="default">
                <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
                Recarregar App
            </Button>
        </div>
      </div>
    );
  }

  // 3. Renderização do Onboarding (Sem Sidebar)
  if (pathname === '/onboarding') {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center w-full">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    );
  }

  // 4. Fallback de Segurança (Se status for no_store mas o useEffect ainda não redirecionou)
  if (storeStatus === 'no_store') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }

  // 5. App Principal (Com Sidebar) - Renderiza apenas se 'has_store'
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
