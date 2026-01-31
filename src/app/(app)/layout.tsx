'use client';

/**
 * @fileOverview AppLayout (Gatekeeper Determinístico)
 * 
 * Centraliza a navegação baseada no BootstrapStatus.
 * Utiliza guardas síncronas para impedir que o Onboarding seja montado para usuários existentes.
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { AdminSidebar } from '@/components/admin-sidebar';
import { Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, bootstrap, store, accessStatus, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdminPath = pathname.startsWith('/admin');

  // 1. Cálculo do Perfil de Acesso
  // Um usuário é "Existente" se possui loja, é membro ou é Administrador do SaaS.
  const isExistingUser = useMemo(() => {
    if (!bootstrap) return false;
    return bootstrap.has_store || bootstrap.is_member || bootstrap.is_admin;
  }, [bootstrap]);

  const isNewUser = !isExistingUser;

  // 2. Lógica de Redirecionamento (Efeito de Navegação)
  useEffect(() => {
    if (loading || !user || !bootstrap) return;

    // Se for novo e não estiver no onboarding -> Força Onboarding
    if (isNewUser && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // Se já for do sistema e estiver no onboarding -> Tira do Onboarding
    if (isExistingUser && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // Restrição de Admin
    if (isAdminPath && !bootstrap.is_admin) {
      router.replace('/dashboard');
      return;
    }

    // Paywall (apenas para rotas comerciais)
    const isPaywallPath = !['/billing', '/settings', '/ai'].some(p => pathname.startsWith(p)) && !isAdminPath && pathname !== '/onboarding';
    if (isPaywallPath && accessStatus && !accessStatus.acesso_liberado) {
      router.replace('/billing');
    }

  }, [user, loading, bootstrap, isExistingUser, isNewUser, accessStatus, pathname, router, isAdminPath]);

  // 3. BLOQUEIO DE RENDERIZAÇÃO (Guarda Síncrona de Camada Zero)
  // Impede flashes de conteúdo indevido antes do redirecionamento
  
  // Exibe loader enquanto carrega a sessão ou o bootstrap inicial
  if (loading || (user && !bootstrap)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium uppercase tracking-widest">Validando Acesso...</p>
      </div>
    );
  }

  // Redirecionamento em progresso: Se a rota não condiz com o perfil, não renderizamos os filhos.
  const isIncorrectRoute = isExistingUser ? pathname === '/onboarding' : pathname !== '/onboarding';
  
  if (user && bootstrap && isIncorrectRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 4. Renderização do Portal
  if (!user || !bootstrap) return null;

  // Layout Especial para Onboarding (Sem Barras Laterais)
  if (pathname === '/onboarding') {
    return <main className="min-h-screen flex items-center justify-center bg-muted/5 w-full">{children}</main>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        {isAdminPath ? <AdminSidebar /> : <MainNav />}
        <SidebarInset className="flex-1 overflow-auto flex flex-col">
          <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h3 className="text-[11px] font-black tracking-tighter uppercase text-primary mb-0.5">
                  {store?.name || (bootstrap.is_admin ? 'Painel SaaS' : 'VendaFácil')}
                </h3>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 font-black uppercase tracking-widest bg-muted/30 border-primary/10 text-primary">
                    {bootstrap.is_admin ? 'Sistema Admin' : (accessStatus?.plano_nome || 'Free')}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5 h-10 w-10" onClick={() => router.push('/settings')}>
                <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback><UserIcon className="h-4 w-4 text-primary" /></AvatarFallback>
                </Avatar>
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-10 w-10" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
