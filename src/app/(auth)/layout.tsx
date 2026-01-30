'use client';

/**
 * @fileOverview AuthLayout (Guardião de Entrada)
 * 
 * Garante que usuários logados nunca vejam as páginas de login/signup.
 */

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Se o usuário logar enquanto está nesta página, o AuthLayout o detecta 
    // e o joga para o dashboard. O AppLayout lá cuidará da loja.
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Enquanto estiver autenticando ou se já estiver logado (em transição), mostrar loader.
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      {children}
    </main>
  );
}
