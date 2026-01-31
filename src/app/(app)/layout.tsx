'use client';

/**
 * @fileOverview AppLayout (Guardião Determinístico + TopBar Global)
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { AdminSidebar } from '@/components/admin-sidebar';
import { Loader2, AlertTriangle, RefreshCcw, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, store, storeStatus, accessStatus, fetchStoreData, logout, sales, products } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdminPath = pathname.startsWith('/admin');

  useEffect(() => {
    if (loading || storeStatus === 'loading_auth') return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (storeStatus === 'loading_store') return;
    if (storeStatus === 'no_store' && pathname !== '/onboarding' && !isAdminPath) {
      router.replace('/onboarding');
      return;
    }
    if (storeStatus === 'has_store' && pathname === '/onboarding') {
      router.replace('/dashboard');
      return;
    }
    if (storeStatus === 'has_store') {
      const isLiberado = accessStatus?.acesso_liberado ?? false;
      const isSafePath = pathname === '/billing' || pathname === '/settings' || isAdminPath;
      if (!isLiberado && !isSafePath) {
        router.replace('/billing');
        return;
      }
    }
  }, [user, loading, storeStatus, accessStatus, pathname, router, isAdminPath]);

  const cmvGlobal = useMemo(() => {
    if (!sales.length || !products.length) return 0;
    const revenue = sales.reduce((acc, s) => acc + s.total_cents, 0);
    const cost = sales.flatMap(s => s.items || []).reduce((acc, item) => {
      const p = products.find(prod => prod.id === item.product_id);
      return acc + ((p?.cost_cents || 0) * item.quantity);
    }, 0);
    return revenue > 0 ? (cost / revenue) * 100 : 0;
  }, [sales, products]);

  if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">Sincronizando ambiente comercial...</p>
      </div>
    );
  }

  if (storeStatus === 'error') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#fcfcfc] p-6">
        <div className="max-w-md w-full flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <AlertTriangle className="h-10 w-10 text-red-500 stroke-[1.5]" />
          </div>
          <h1 className="text-2xl font-headline font-bold text-slate-900 mb-4">Falha na Comunicação</h1>
          <div className="text-slate-500 text-base mb-10">Ocorreu um erro ao carregar os dados da sua loja.</div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => user && fetchStoreData(user.id)} className="h-12 px-8 font-semibold gap-2 shadow-sm">
              <RefreshCcw className="h-4 w-4" /> Tentar Reconectar
            </Button>
            <Button variant="ghost" onClick={() => logout()} className="text-slate-400">Sair da conta</Button>
          </div>
        </div>
      </div>
    );
  }

  if (pathname === '/onboarding') {
    return <main className="min-h-screen flex items-center justify-center bg-muted/5">{children}</main>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        {isAdminPath ? <AdminSidebar /> : <MainNav />}
        <SidebarInset className="flex-1 overflow-auto flex flex-col">
          {/* TopBar Global */}
          <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h3 className="text-sm font-black tracking-tighter uppercase text-primary">{store?.name || 'VendaFácil'}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] h-4 font-bold uppercase tracking-wider">{accessStatus?.plano_nome || 'Free'}</Badge>
                  <Badge variant="secondary" className={cmvGlobal > 40 ? "text-[9px] h-4 bg-red-50 text-red-600 border-red-100" : "text-[9px] h-4 bg-green-50 text-green-600 border-green-100"}>
                    CMV: {cmvGlobal.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5" onClick={() => router.push('/settings')}>
                <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback><UserIcon className="h-4 w-4 text-primary" /></AvatarFallback>
                </Avatar>
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/5">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
