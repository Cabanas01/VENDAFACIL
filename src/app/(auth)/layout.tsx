'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * AuthLayout (Guardião da Área de Login)
 * Resolve o problema do "não prosseguir". Se estiver logado, manda para o dashboard.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se estiver logado, useEffect redireciona. Renderizamos null para evitar flash de tela.
  if (user) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      {children}
    </main>
  );
}