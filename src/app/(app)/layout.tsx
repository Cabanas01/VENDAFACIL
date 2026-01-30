'use client';

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';

/**
 * AppLayout (Guardião Único)
 * Centraliza a lógica de proteção de rotas e carregamento inicial.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  // 1. Aguarda carregamento inicial do AuthProvider
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Autenticando...</p>
      </div>
    );
  }

  // 2. Se não houver usuário após o loading, redireciona para login
  if (!user) {
    redirect('/login');
  }

  // 3. Usuário autenticado → Renderiza layout completo da aplicação
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainNav />
        <SidebarInset>
          <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
