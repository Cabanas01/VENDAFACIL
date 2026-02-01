import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { AdminSidebar } from '@/components/admin-sidebar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/**
 * AppLayout (Server Gatekeeper)
 * 
 * dynamic = 'force-dynamic' é OBRIGATÓRIO para páginas que usam cookies/auth.
 * O Providers já é provido pelo RootLayout, não deve ser repetido aqui.
 */
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '/dashboard';

  // 1. Validar Identidade
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Validar Status de Bootstrap (RPC Segura)
  const { data: status, error: rpcError } = await supabase.rpc('get_user_bootstrap_status');
  
  if (rpcError || !status) {
    console.error('[GATEKEEPER_RPC_FAILED]', rpcError);
    redirect('/login');
  }

  const { has_store, is_member, is_admin } = status as any;

  // 3. Regras de Fluxo (Determinísticas)
  const isNewUser = !has_store && !is_member && !is_admin;

  if (isNewUser && !pathname.startsWith('/onboarding')) {
    redirect('/onboarding');
  }

  if (!isNewUser && pathname.startsWith('/onboarding')) {
    redirect(is_admin ? '/admin' : '/dashboard');
  }

  if (pathname.startsWith('/admin') && !is_admin) {
    redirect('/dashboard');
  }

  const isAdminPath = pathname.startsWith('/admin');
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        {isAdminPath ? <AdminSidebar /> : <MainNav />}
        <SidebarInset className="flex-1 overflow-auto flex flex-col">
          <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black tracking-tighter uppercase text-primary mb-0.5">
                  {isAdminPath ? 'Portal SaaS Admin' : 'VendaFácil'}
                </h3>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 font-black uppercase bg-primary/5 border-primary/10 text-primary">
                    {is_admin ? 'Super Admin' : 'Conta Ativa'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-[10px] font-black text-muted-foreground lowercase">{user.email}</p>
              </div>
              <Avatar className="h-8 w-8 ring-2 ring-primary/10 shadow-sm">
                <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
