'use client';

/**
 * @fileOverview AdminLayout
 * 
 * Garante que apenas usuários com flag is_admin possam acessar sub-rotas administrativas.
 * Verifica o estado de carregamento global para evitar redirecionamentos falsos.
 */

import { useAuth } from '@/components/auth-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { Terminal } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, storeStatus, loading } = useAuth();

  // Aguarda tanto a autenticação quanto a carga inicial do perfil/loja
  if (loading || storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Validando credenciais administrativas...
        </p>
      </div>
    );
  }

  // Verifica explicitamente se a flag is_admin está presente no perfil carregado do DB
  if (!user?.is_admin) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pt-20">
        <PageHeader title="Acesso Restrito" />
        <Alert variant="destructive" className="border-2 shadow-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="font-black uppercase tracking-tighter">Privilégios Insuficientes</AlertTitle>
          <AlertDescription className="text-sm">
            Sua conta (<span className="font-bold">{user?.email}</span>) não possui permissões de Administrador do SaaS. 
            Esta área é exclusiva para a equipe de governança e suporte central.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  );
}
