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
  Bot,
  ChevronDown,
  LogOut,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const adminNavItems = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/stores', label: 'Lojas (Tenants)', icon: Store, exact: false },
  { href: '/admin/sales', label: 'Vendas (Hotmart)', icon: CreditCard, exact: false },
  { href: '/admin/customers', label: 'Clientes Global', icon: Users, exact: false },
];

const systemNavItems = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart, exact: true },
  { href: '/admin/logs', label: 'Logs de Auditoria', icon: FileText, exact: true },
  { href: '/admin/errors', label: 'Erros e Falhas', icon: AlertTriangle, exact: true },
];

const aiNavItems = [
  { href: '/admin/ai', label: 'IA Admin', icon: Bot, exact: true },
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
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
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
              {systemNavItems.map((item) => (
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
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiNavItems.map((item) => (
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
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mb-4 gap-2 text-xs font-bold border-primary/20 hover:bg-primary/5"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-3 w-3" /> Voltar para Loja
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between px-2 h-12">
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-8 w-8 rounded-full ring-2 ring-primary/20">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-xs font-black truncate w-full">{user?.email}</span>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-widest">SaaS Admin</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Gestão SaaS</DropdownMenuLabel>
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
