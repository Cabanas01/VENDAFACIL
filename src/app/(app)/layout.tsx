'use client';

/**
 * @fileOverview AppLayout (O Guardião Único)
 * 
 * Este componente é o único autorizado a executar redirecionamentos.
 * Ele observa a máquina de estados do AuthProvider e decide o destino do usuário.
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, storeStatus, accessStatus, fetchStoreData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Aguardar autenticação inicial
    if (loading) return;

    // 2. Sem user -> Login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 3. Aguardar estados conclusivos da loja
    if (storeStatus === 'loading_auth' || storeStatus === 'loading_store') return;

    // 4. Sem loja -> Onboarding
    if (storeStatus === 'no_store' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 5. Com loja mas no onboarding -> Dashboard
    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 6. Paywall (Se liberado === false e não for rota segura)
    const isLiberado = accessStatus?.acesso_liberado ?? false;
    const isSafePath = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding';

    if (storeStatus === 'has_store' && !isLiberado && !isSafePath) {
      router.replace('/billing');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  /**
   * ESTADOS DE RENDERIZAÇÃO
   */

  // Estado 1: Sincronizando (Loader)
  if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return <LoaderScreen message={storeStatus === 'loading_store' ? 'Sincronizando dados da sua loja...' : 'Validando sua sessão...'} />;
  }

  // Estado 2: Falha Técnica (ErrorScreen)
  if (storeStatus === 'error') {
    return <ErrorScreen onRetry={() => user && fetchStoreData(user.id)} />;
  }

  // Estado 3: Onboarding (Sem Sidebar)
  if (pathname === '/onboarding') {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center w-full">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    );
  }

  // Estado 4: Aplicação Principal (Com Sidebar)
  // Só renderiza se tiver loja. Se estiver redirecionando, o Loader acima já segurou.
  if (storeStatus !== 'has_store') {
    return <LoaderScreen message="Aguardando confirmação do sistema..." />;
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

/**
 * Componentes de Feedback (Sênior)
 */

function LoaderScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse font-medium">{message}</p>
    </div>
  );
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="bg-destructive/10 p-4 rounded-full mb-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Erro de Sincronização</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Não conseguimos validar os dados da sua loja. Isso pode ser instabilidade de rede ou erro de permissão (RLS).
      </p>
      <div className="flex gap-3">
        <Button onClick={onRetry} variant="default">
          <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Recarregar Página
        </Button>
      </div>
    </div>
  );
}
