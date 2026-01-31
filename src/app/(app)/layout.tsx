import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { AdminSidebar } from '@/components/admin-sidebar';
import { Providers } from '@/app/providers';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BootstrapStatus } from '@/lib/types';

/**
 * @fileOverview AppLayout (SERVER-SIDE GATEKEEPER)
 * 
 * Este é o cérebro da navegação do SaaS. Ele decide no SERVIDOR se o usuário
 * deve ver o Onboarding, o Dashboard ou o Admin.
 * Zero Flicker. Zero Client-side logic for routing.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const headerList = headers();
  const pathname = headerList.get('x-pathname') || '/dashboard';

  // 1. Validar Sessão
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Buscar Status Atômico (Bootstrap)
  const { data: bootstrap, error: rpcError } = await supabase.rpc('get_user_bootstrap_status');
  
  if (rpcError || !bootstrap) {
    console.error('[SERVER_BOOTSTRAP_ERROR]', rpcError);
    redirect('/login');
  }

  const status = bootstrap as BootstrapStatus;

  /**
   * 🚨 REGRA DE OURO DO VENDafácil
   * Um usuário só entra no Onboarding se: NÃO tem loja E NÃO é membro E NÃO é admin.
   */
  const isNewUser = !status.has_store && !status.is_member && !status.is_admin;

  // 3. EXECUÇÃO DOS REDIRECTS SÍNCRONOS (SERVER-SIDE)
  
  // Se for novo usuário e não estiver no onboarding -> vai pro onboarding
  if (isNewUser && pathname !== '/onboarding') {
    redirect('/onboarding');
  }

  // Se NÃO for novo usuário e estiver no onboarding -> vai pro dashboard
  if (!isNewUser && pathname === '/onboarding') {
    redirect('/dashboard');
  }

  // Proteção de rotas admin
  if (pathname.startsWith('/admin') && !status.is_admin) {
    redirect('/dashboard');
  }

  const isAdminPath = pathname.startsWith('/admin');

  // Para renderizar o header com dados da loja (se houver)
  let storeName = 'VendaFácil';
  if (status.has_store || status.is_member) {
    const { data: storeData } = await supabase
      .from('stores')
      .select('name')
      .limit(1)
      .maybeSingle();
    if (storeData) storeName = storeData.name;
  }

  return (
    <Providers>
      <SidebarProvider>
        <div className="flex min-h-screen w-full overflow-hidden">
          {isAdminPath ? <AdminSidebar /> : <MainNav />}
          <SidebarInset className="flex-1 overflow-auto flex flex-col">
            <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-50">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <h3 className="text-[11px] font-black tracking-tighter uppercase text-primary mb-0.5">
                    {isAdminPath ? 'Painel SaaS' : storeName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 font-black uppercase tracking-widest bg-muted/30 border-primary/10 text-primary">
                      {status.is_admin ? 'SaaS Admin' : 'Portal Logado'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback><UserIcon className="h-4 w-4 text-primary" /></AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-bold leading-none">{user.email}</p>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </Providers>
  );
}
