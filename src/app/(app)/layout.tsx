'use client';

/**
 * @fileOverview AppLayout (Guardião Determinístico de Navegação)
 * 
 * Centraliza a lógica de redirecionamento baseada no BootstrapStatus.
 * Bloqueia renderização de filhos até que o estado de acesso seja coerente com a rota.
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
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

  // Lógica de Redirecionamento em Efeito (Navegação)
  useEffect(() => {
    if (loading) return;

    // 1. Sem usuário -> Login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Sem dados de bootstrap -> Login (Falha de segurança)
    if (!bootstrap) {
      router.replace('/login');
      return;
    }

    // 3. Regra de Ouro: Identificar se o usuário PRECISA de onboarding
    // Um usuário existente tem loja, é membro OU é administrador do SaaS.
    const isExistingUser = bootstrap.has_store || bootstrap.is_member || bootstrap.is_admin;
    const isNewUser = !isExistingUser;

    // Se for novo e não estiver no onboarding -> Força Onboarding
    if (isNewUser && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    // Se já for do sistema e estiver no onboarding -> Força Dashboard
    if (!isNewUser && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }

    // 4. Restrição de Admin
    if (isAdminPath && !bootstrap.is_admin) {
      router.replace('/dashboard');
      return;
    }

    // 5. Paywall (apenas rotas comerciais para usuários não-admin)
    const isPaywallPath = !['/billing', '/settings', '/ai'].some(p => pathname.startsWith(p)) && !isAdminPath;
    if (isPaywallPath && accessStatus && !accessStatus.acesso_liberado) {
      router.replace('/billing');
    }

  }, [user, loading, bootstrap, accessStatus, pathname, router, isAdminPath]);

  // Loader Central: Impede qualquer renderização durante a resolução de estados
  if (loading || (user && !bootstrap)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium uppercase tracking-widest">Sincronizando Sistema...</p>
      </div>
    );
  }

  // Curto-circuito de segurança: Impede flashes de conteúdo errado
  if (!user || !bootstrap) return null;

  // Bloqueio de Renderização Síncrono (Gatekeeper de Camada Zero)
  const isExistingUser = bootstrap.has_store || bootstrap.is_member || bootstrap.is_admin;
  const isIncorrectRoute = isExistingUser ? pathname === '/onboarding' : pathname !== '/onboarding';
  
  if (isIncorrectRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Layout Especial para Onboarding
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
