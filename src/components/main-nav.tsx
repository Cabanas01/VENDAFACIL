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
  ChevronRight,
  ClipboardList,
  ChefHat,
  GlassWater
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: Home, exact: true },
  { href: '/sales/new', label: 'Vendas / PDV', icon: ShoppingCart, exact: false },
  { href: '/comandas', label: 'Comandas Eletrônicas', icon: ClipboardList, exact: false },
  { href: '/dashboard/products', label: 'Produtos', icon: Package, exact: true },
  { href: '/dashboard/customers', label: 'Clientes', icon: Users, exact: true },
  { href: '/cash', label: 'Caixa', icon: Wallet, exact: true },
];

const managementNavItems = [
  { href: '/dashboard/cmv', label: 'CMV Estratégico', icon: Target, exact: true },
  { href: '/reports', label: 'Relatórios', icon: BarChart3, exact: true },
  { href: '/team', label: 'Equipe', icon: Users2, exact: true },
];

const configNavItems = [
  { href: '/billing', label: 'Plano e Assinatura', icon: CreditCard, exact: true },
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
    <Sidebar className="border-r border-white/5 bg-slate-950 text-white">
      <SidebarHeader className="p-6 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Avatar className="h-10 w-10 rounded-xl shadow-2xl ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300">
              <AvatarImage src={store?.logo_url ?? undefined} alt={store?.name} className="object-cover" />
              <AvatarFallback className="bg-primary text-white font-black text-sm">
                {store?.name?.substring(0, 2).toUpperCase() || 'VF'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-slate-950 rounded-full shadow-sm animate-pulse" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-black tracking-tight text-white uppercase leading-none">VendaFácil</h2>
            <p className="text-[10px] text-slate-400 font-bold truncate mt-1 tracking-wide opacity-80 uppercase">
              {store?.name || 'Minha Loja'}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6 space-y-8 bg-slate-950">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.25em] px-4 text-slate-500 mb-2">
            Operacional
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href, item.exact)} 
                    className={cn(
                      "px-4 h-11 transition-all duration-200 rounded-lg group",
                      isActive(item.href, item.exact) 
                        ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                        isActive(item.href, item.exact) ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                      )} />
                      <span className="font-bold text-xs tracking-tight">{item.label}</span>
                      {isActive(item.href, item.exact) && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {store?.use_comanda && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.25em] px-4 text-slate-500 mb-2">
              Produção (Painéis)
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/painel/cozinha', true)} className={cn("px-4 h-11 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white", isActive('/painel/cozinha', true) && "bg-primary text-white")}>
                    <Link href="/painel/cozinha" className="flex items-center gap-3">
                      <ChefHat className="h-4 w-4" />
                      <span className="font-bold text-xs tracking-tight">Cozinha</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/painel/bar', true)} className={cn("px-4 h-11 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white", isActive('/painel/bar', true) && "bg-primary text-white")}>
                    <Link href="/painel/bar" className="flex items-center gap-3">
                      <GlassWater className="h-4 w-4" />
                      <span className="font-bold text-xs tracking-tight">Bar</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.25em] px-4 text-slate-500 mb-2">
            Estratégico
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {managementNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href, item.exact)} 
                    className={cn(
                      "px-4 h-11 transition-all duration-200 rounded-lg group",
                      isActive(item.href, item.exact) 
                        ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                        isActive(item.href, item.exact) ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                      )} />
                      <span className="font-bold text-xs tracking-tight">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.25em] px-4 text-slate-500 mb-2">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {configNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href, item.exact)} 
                    className={cn(
                      "px-4 h-11 transition-all duration-200 rounded-lg group",
                      isActive(item.href, item.exact) 
                        ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                        isActive(item.href, item.exact) ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                      )} />
                      <span className="font-bold text-xs tracking-tight">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/5 bg-slate-950">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between px-3 h-16 hover:bg-white/5 transition-all duration-200 group rounded-xl border border-transparent hover:border-white/10">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative">
                  <Avatar className="h-10 w-10 rounded-full ring-2 ring-white/10 group-hover:ring-primary/50 transition-all duration-300 shadow-xl">
                    <AvatarImage src={user?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-black text-sm">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-xs font-black truncate w-full text-white tracking-tight">Painel de Acesso</span>
                  <span className="text-[10px] text-slate-500 font-bold truncate w-full lowercase opacity-80">{user?.email}</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-600 group-hover:text-white transition-colors duration-200" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 border-slate-800 bg-slate-900 text-white shadow-2xl p-2 rounded-xl">
            <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest px-3 py-2">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => router.push('/settings')} className="text-xs font-bold hover:bg-white/10 focus:bg-white/10 cursor-pointer py-3 rounded-lg transition-colors">
              <Settings className="mr-3 h-4 w-4 text-slate-400" /> Configurações Gerais
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => logout()} className="text-red-400 text-xs font-black hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer py-3 rounded-lg transition-colors">
              <LogOut className="mr-3 h-4 w-4" /> Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
