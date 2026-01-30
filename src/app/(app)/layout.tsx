'use client';

/**
 * @fileOverview AppLayout (Guardião Único)
 * 
 * Este componente é o único lugar autorizado a executar redirecionamentos de fluxo.
 * Ele observa a Máquina de Estados do AuthProvider e decide o destino do usuário.
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
    // 1. Aguardar autenticação inicial
    if (loading) return;

    // 2. Segurança: Se não está logado, expulsa para login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 3. Aguardar estado conclusivo da loja (has_store | no_store | error)
    if (storeStatus === 'loading_auth' || storeStatus === 'loading_store' || storeStatus === 'unknown') return;

    // 4. ONBOARDING: Se CONCLUSIVAMENTE não tem loja, manda para onboarding
    if (storeStatus === 'no_store' && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // 5. DASHBOARD: Se tem loja mas está no onboarding, manda para dashboard
    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 6. PAYWALL: Bloqueio de acesso expirado (se aplicável)
    const isAccessBlocked = accessStatus && !accessStatus.acesso_liberado;
    const isSafePath = pathname === '/billing' || pathname === '/settings' || pathname === '/onboarding';
    
    if (storeStatus === 'has_store' && isAccessBlocked && !isSafePath) {
      router.replace('/billing');
      return;
    }

  }, [user, loading, storeStatus, accessStatus, pathname, router]);

  /**
   * RENDERIZAÇÃO DE ESTADOS DE TRANSIÇÃO (Evita Tela Branca)
   */

  // Estado 1: Sincronização em curso
  if (loading || storeStatus === 'unknown' || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          {storeStatus === 'loading_store' ? 'Sincronizando dados da sua loja...' : 'Validando sua sessão...'}
        </p>
      </div>
    );
  }

  // Estado 2: Falha Técnica (Safety Lock)
  // Bloqueia onboarding para não criar duplicidade enquanto o banco está instável
  if (storeStatus === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="bg-destructive/10 p-4 rounded-full">
            <AlertOctagon className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
            <h1 className="text-2xl font-bold">Erro de Sincronização</h1>
            <p className="text-muted-foreground">
                Não conseguimos validar os dados da sua loja devido a uma falha de conexão ou permissão (RLS).
                <strong> Por segurança, o acesso ao onboarding foi bloqueado para evitar duplicidade.</strong>
            </p>
        </div>
        <div className="flex gap-3">
            <Button onClick={() => user && fetchStoreData(user.id)} variant="default">
                <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
                Recarregar Sistema
            </Button>
        </div>
      </div>
    );
  }

  // Estado 3: Onboarding (Sem Sidebar)
  if (pathname === '/onboarding') {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center w-full">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    );
  }

  // Estado 4: App Principal (Com Sidebar) - Renderiza apenas se 'has_store'
  // Nota: Se 'no_store' e ainda não redirecionou, o Loader acima segura.
  if (storeStatus !== 'has_store') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
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
