
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
    <Sidebar className="border-r border-primary/10">
      <SidebarHeader className="p-4 border-b border-sidebar-border bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-black tracking-tighter text-primary uppercase">Painel SaaS</h2>
            <p className="text-[10px] text-muted-foreground font-bold truncate italic">Administração Central</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-black uppercase tracking-widest px-4 mb-2">Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)} className="h-10 px-4">
                    <Link href={item.href} className="flex items-center gap-3 font-bold text-xs">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[9px] font-black uppercase tracking-widest px-4 mb-2">Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)} className="h-10 px-4">
                    <Link href={item.href} className="flex items-center gap-3 font-bold text-xs">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mb-4 gap-2 text-[10px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 h-10"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-3 w-3" /> Voltar para Loja
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between px-2 h-14 hover:bg-primary/5">
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-8 w-8 rounded-full ring-2 ring-primary/20 shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px]">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-[10px] font-black truncate w-full text-foreground lowercase">{user?.email}</span>
                  <span className="text-[9px] text-primary uppercase font-black tracking-[0.15em]">SaaS Admin</span>
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest">Gestão SaaS</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive font-bold text-xs">
              <LogOut className="mr-3 h-4 w-4" /> Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
