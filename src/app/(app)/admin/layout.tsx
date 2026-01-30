
'use client';

/**
 * @fileOverview AdminLayout
 * 
 * Garante que apenas usuários com flag is_admin possam acessar sub-rotas administrativas.
 */

import { useAuth } from '@/components/auth-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { Terminal, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, storeStatus } = useAuth();

  if (storeStatus === 'loading_auth' || storeStatus === 'loading_store') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Validando credenciais administrativas...</p>
      </div>
    );
  }

  if (!user?.is_admin) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pt-20">
        <PageHeader title="Acesso Restrito" />
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Privilégios Insuficientes</AlertTitle>
          <AlertDescription>
            Sua conta não possui permissões de Administrador do SaaS. Esta área é restrita à equipe de governança.
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
