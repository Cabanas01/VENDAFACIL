'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, storeStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // REGRA DE OURO: Se o usuário logar, o AuthLayout detecta e o empurra para fora.
    // O AppLayout no destino cuidará da lógica de onboarding/dashboard.
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Enquanto estiver autenticando ou se já estiver logado (redirecionando), mostrar loader.
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
