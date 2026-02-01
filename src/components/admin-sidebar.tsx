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
  LayoutDashboard,
  Store,
  CreditCard,
  Users,
  BarChart,
  FileText,
  AlertTriangle,
  ChevronDown,
  LogOut,
  ShieldCheck,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/stores', label: 'Lojas (Tenants)', icon: Store, exact: false },
  { href: '/admin/sales', label: 'Vendas Global', icon: CreditCard, exact: false },
  { href: '/admin/customers', label: 'Clientes Global', icon: Users, exact: false },
];

const systemNavItems = [
  { href: '/admin/analytics', label: 'Analytics Interno', icon: BarChart, exact: true },
  { href: '/admin/logs', label: 'Logs de Auditoria', icon: FileText, exact: true },
  { href: '/admin/billing', label: 'Eventos Financeiros', icon: AlertTriangle, exact: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const isActive = (href: string, exact: boolean) => {
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <Sidebar className="border-r border-white/5 bg-slate-950 text-white">
      <SidebarHeader className="p-6 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/30 ring-2 ring-primary/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-black tracking-tighter text-white uppercase leading-none">Admin SaaS</h2>
            <p className="text-[10px] text-slate-500 font-bold truncate mt-1 tracking-widest uppercase">Governança Master</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6 space-y-8 bg-slate-950">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.25em] px-4 text-slate-500 mb-2">
            Gestão de Ativos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {adminNavItems.map((item) => (
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
                        isActive(item.href, item.exact) ? 'text-white' : 'text-slate-500 group-hover:text-white'
                      )} />
                      <span className="text-xs font-bold tracking-tight">{item.label}</span>
                      {isActive(item.href, item.exact) && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.25em] px-4 text-slate-500 mb-2">
            Infraestrutura
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {systemNavItems.map((item) => (
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
                        isActive(item.href, item.exact) ? 'text-white' : 'text-slate-500 group-hover:text-white'
                      )} />
                      <span className="text-xs font-bold tracking-tight">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/5 bg-slate-950">
        <Button 
          asChild
          variant="outline" 
          size="sm" 
          className="w-full mb-4 gap-2 text-[10px] font-black uppercase tracking-[0.2em] border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white h-11 shadow-inner transition-all rounded-lg cursor-pointer"
        >
          <Link href="/dashboard">
            <ArrowLeft className="h-3 w-3" /> Voltar ao PDV
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between px-3 h-16 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all duration-200">
              <div className="flex items-center gap-3 overflow-hidden text-left">
                <Avatar className="h-10 w-10 rounded-full ring-2 ring-white/5 group-hover:ring-primary/50 transition-all duration-300 shadow-2xl">
                  <AvatarFallback className="bg-primary text-white font-black text-xs">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-[11px] font-black truncate w-full text-white lowercase leading-tight">{user?.email}</span>
                  <span className="text-[9px] text-primary uppercase font-black tracking-widest mt-1 opacity-90">SaaS Supervisor</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-600 group-hover:text-white transition-colors" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 border-slate-800 bg-slate-900 text-white p-2 shadow-2xl rounded-xl">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2">Admin Options</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => logout()} className="text-red-400 font-black text-xs hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer py-3 rounded-lg transition-colors">
              <LogOut className="mr-3 h-4 w-4" /> Deslogar Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
