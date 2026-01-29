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
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, exact: true },
  { href: '/sales', label: 'Vendas', icon: ShoppingCart, exact: false },
  { href: '/products', label: 'Produtos', icon: Package, exact: true },
  { href: '/clients', label: 'Clientes', icon: Users, exact: true },
  { href: '/cash', label: 'Caixa', icon: Wallet, exact: true },
  { href: '/reports', label: 'Relatórios', icon: BarChart3, exact: true },
];

const settingsNav = { href: '/settings', label: 'Configurações', icon: Settings };
const billingNav = { href: '/billing', label: 'Plano e Assinatura', icon: CreditCard };

export function MainNav() {
  const pathname = usePathname();
  const { user, store, logout } = useAuth();
  const router = useRouter();

  const isNavItemActive = (href: string, exact: boolean) => {
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="rounded-md">
            <AvatarImage src={store?.logo_url} alt="VendaFacil Logo" />
            <AvatarFallback>VF</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 className="text-lg font-headline font-semibold text-sidebar-primary">VendaFacil</h2>
            <p className="text-sm text-sidebar-foreground/80">{store?.name ?? 'Minha Loja'}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  isActive={isNavItemActive(item.href, item.exact)}
                  className="justify-start"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
            <SidebarMenuItem>
                <Link href={billingNav.href} passHref>
                    <SidebarMenuButton
                    isActive={pathname.startsWith(billingNav.href)}
                    className="justify-start"
                    >
                    <billingNav.icon className="h-5 w-5" />
                    <span>{billingNav.label}</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href={settingsNav.href} passHref>
                    <SidebarMenuButton
                    isActive={pathname.startsWith(settingsNav.href)}
                    className="justify-start"
                    >
                    <settingsNav.icon className="h-5 w-5" />
                    <span>{settingsNav.label}</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="justify-start items-center w-full h-auto p-2 mt-4 text-left">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar_url} alt={user?.name ?? ''} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-sidebar-foreground">{user?.name}</span>
                  <span className="text-xs text-sidebar-foreground/70">{user?.email}</span>
                </div>
              </div>
              <ChevronDown className="ml-auto h-4 w-4 text-sidebar-foreground/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
