
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
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const adminNavItems = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/stores', label: 'Lojas (Tenants)', icon: Store, exact: false },
  { href: '/admin/sales', label: 'Vendas Global', icon: CreditCard, exact: false },
  { href: '/admin/customers', label: 'Clientes Global', icon: Users, exact: false },
];

const systemNavItems = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart, exact: true },
  { href: '/admin/logs', label: 'Logs de Auditoria', icon: FileText, exact: true },
  { href: '/admin/billing', label: 'Eventos de Faturamento', icon: AlertTriangle, exact: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const isActive = (href: string, exact: boolean) => {
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <Sidebar className="border-r border-slate-200 bg-slate-50">
      <SidebarHeader className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-black tracking-tighter text-slate-900 uppercase">Painel SaaS</h2>
            <p className="text-[10px] text-slate-600 font-bold truncate italic">Administração Central</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 text-slate-600 mb-2 opacity-100">Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href, item.exact)} 
                    className={`h-10 px-4 transition-all ${
                      isActive(item.href, item.exact) 
                        ? 'bg-primary text-white shadow-sm font-black' 
                        : 'text-slate-900 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${isActive(item.href, item.exact) ? 'text-white' : 'text-slate-600'}`} />
                      <span className="text-xs font-bold">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 text-slate-600 mb-2 opacity-100">Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href, item.exact)} 
                    className={`h-10 px-4 transition-all ${
                      isActive(item.href, item.exact) 
                        ? 'bg-primary text-white shadow-sm font-black' 
                        : 'text-slate-900 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${isActive(item.href, item.exact) ? 'text-white' : 'text-slate-600'}`} />
                      <span className="text-xs font-bold">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-200 bg-white">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mb-4 gap-2 text-[10px] font-black uppercase tracking-widest border-slate-300 text-slate-900 hover:bg-slate-50 h-10 shadow-sm"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-3 w-3" /> Voltar para Loja
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between px-2 h-14 hover:bg-slate-50 group border border-transparent hover:border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 overflow-hidden text-left">
                <Avatar className="h-9 w-9 rounded-full ring-2 ring-slate-200 group-hover:ring-primary/20 transition-all">
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-[11px] font-black truncate w-full text-slate-900 lowercase">{user?.email}</span>
                  <span className="text-[9px] text-primary uppercase font-black tracking-widest">SaaS Admin</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-900" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 border-slate-200 p-2 shadow-xl">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 mb-1">Gestão SaaS</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-red-600 font-bold text-xs hover:bg-red-50 focus:bg-red-50 cursor-pointer py-3 rounded-md">
              <LogOut className="mr-3 h-4 w-4" /> Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
