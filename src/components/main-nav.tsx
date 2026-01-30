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
  LineChart,
  Target,
  Users2,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const mainNavItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: Home, exact: true },
  { href: '/sales/new', label: 'Frente de Caixa (PDV)', icon: ShoppingCart, exact: false },
  { href: '/sales', label: 'Histórico de Vendas', icon: LineChart, exact: false },
  { href: '/dashboard/products', label: 'Produtos e Estoque', icon: Package, exact: true },
  { href: '/dashboard/customers', label: 'Meus Clientes', icon: Users, exact: true },
  { href: '/cash', label: 'Caixa do Dia', icon: Wallet, exact: true },
];

const managementNavItems = [
  { href: '/dashboard/cmv', label: 'Análise de CMV', icon: Target, exact: true },
  { href: '/reports', label: 'Relatórios IA', icon: BarChart3, exact: true },
  { href: '/team', label: 'Equipe e Acessos', icon: Users2, exact: true },
];

const configNavItems = [
  { href: '/billing', label: 'Minha Assinatura', icon: CreditCard, exact: true },
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
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={store?.logo_url ?? undefined} alt={store?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {store?.name?.substring(0, 2).toUpperCase() || 'VF'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-bold truncate text-sidebar-primary">VendaFácil</h2>
            <p className="text-xs text-sidebar-foreground/60 truncate italic">{store?.name || 'Minha Loja'}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton isActive={isActive(item.href, item.exact)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão Financeira</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton isActive={isActive(item.href, item.exact)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton isActive={isActive(item.href, item.exact)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between px-2 h-12">
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-xs font-bold truncate w-full">{user?.email}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Perfil</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
