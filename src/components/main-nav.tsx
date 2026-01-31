'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  ShoppingCart,
  Package,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  CreditCard,
  Users,
  Target,
  Users2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const mainNavItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: Home, exact: true },
  { href: '/sales/new', label: 'Vendas / PDV', icon: ShoppingCart, exact: false },
  { href: '/dashboard/products', label: 'Produtos', icon: Package, exact: true },
  { href: '/dashboard/customers', label: 'Clientes', icon: Users, exact: true },
  { href: '/cash', label: 'Caixa', icon: Wallet, exact: true },
];

const managementNavItems = [
  { href: '/dashboard/cmv', label: 'CMV Estratégico', icon: Target, exact: true },
  { href: '/ai', label: 'IA Assistente', icon: Sparkles, exact: true },
  { href: '/reports', label: 'Relatórios', icon: BarChart3, exact: true },
  { href: '/team', label: 'Equipe', icon: Users2, exact: true },
];

const configNavItems = [
  { href: '/billing', label: 'Plano', icon: CreditCard, exact: true },
  { href: '/settings', label: 'Configurações', icon: Settings, exact: true },
];

export function MainNav() {
  const pathname = usePathname();
  const { user, store, logout } = useAuth();
  const router = useRouter();

  const isActive = (href: string, exact: boolean) => {
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border bg-primary/5">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg shadow-sm border border-primary/10">
            <AvatarImage src={store?.logo_url ?? undefined} alt={store?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-black text-sm">
              {store?.name?.substring(0, 2).toUpperCase() || 'VF'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-black tracking-tighter text-primary uppercase">VendaFácil</h2>
            <p className="text-[10px] text-muted-foreground font-bold truncate italic">{store?.name || 'Minha Loja'}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 opacity-50">Operacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)} className="px-4 h-10">
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span className="font-bold text-xs">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 opacity-50">Estratégico</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)} className="px-4 h-10">
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span className="font-bold text-xs">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 opacity-50">Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)} className="px-4 h-10">
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span className="font-bold text-xs">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border bg-muted/5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between px-2 h-12 hover:bg-primary/5 transition-colors">
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-8 w-8 rounded-full ring-2 ring-primary/10">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-[10px] font-black truncate w-full">{user?.email}</span>
                  <span className="text-[9px] text-primary uppercase font-bold tracking-tighter">CONTA ATIVA</span>
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-primary/10 shadow-xl">
            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Meu Portal</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')} className="text-xs font-bold">
              <Settings className="mr-2 h-4 w-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive text-xs font-bold">
              <LogOut className="mr-2 h-4 w-4" /> Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
