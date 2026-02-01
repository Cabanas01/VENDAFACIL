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
    <Sidebar className="border-r border-slate-800 bg-[#0f172a] text-white">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg shadow-sm bg-primary/20 ring-1 ring-white/10">
            <AvatarImage src={store?.logo_url ?? undefined} alt={store?.name} />
            <AvatarFallback className="bg-primary text-white font-black text-xs">
              {store?.name?.substring(0, 2).toUpperCase() || 'VF'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-black tracking-tighter text-primary uppercase">VendaFácil</h2>
            <p className="text-[10px] text-slate-300 font-bold truncate italic tracking-tight opacity-90">{store?.name || 'Minha Loja'}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.2em] px-4 text-slate-400 mb-2">Operacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href, item.exact)} 
                    className={`px-4 h-10 transition-all hover:bg-white/10 ${
                      isActive(item.href, item.exact) 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${isActive(item.href, item.exact) ? 'opacity-100' : 'opacity-70'}`} />
                      <span className="font-bold text-xs tracking-tight">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.2em] px-4 text-slate-400 mb-2">Estratégico</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href, item.exact)} 
                    className={`px-4 h-10 transition-all hover:bg-white/10 ${
                      isActive(item.href, item.exact) 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${isActive(item.href, item.exact) ? 'opacity-100' : 'opacity-70'}`} />
                      <span className="font-bold text-xs tracking-tight">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.2em] px-4 text-slate-400 mb-2">Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href, item.exact)} 
                    className={`px-4 h-10 transition-all hover:bg-white/10 ${
                      isActive(item.href, item.exact) 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${isActive(item.href, item.exact) ? 'opacity-100' : 'opacity-70'}`} />
                      <span className="font-bold text-xs tracking-tight">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between px-2 h-14 hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-9 w-9 rounded-full ring-2 ring-white/10 group-hover:ring-primary/50 transition-all">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-[11px] font-bold truncate w-full text-slate-200 group-hover:text-white transition-colors">{user?.email}</span>
                  <span className="text-[9px] text-primary uppercase font-black tracking-widest">CONTA ATIVA</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 border-slate-800 bg-[#0f172a] text-white shadow-2xl p-2">
            <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest px-3 mb-1">Meu Portal</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem onClick={() => router.push('/settings')} className="text-xs font-bold hover:bg-white/10 focus:bg-white/10 cursor-pointer py-3 rounded-md">
              <Settings className="mr-3 h-4 w-4 text-slate-400" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem onClick={() => logout()} className="text-red-400 text-xs font-bold hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer py-3 rounded-md">
              <LogOut className="mr-3 h-4 w-4" /> Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
