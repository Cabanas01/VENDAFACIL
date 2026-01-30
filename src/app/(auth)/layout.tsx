'use client';

/**
 * @fileOverview AuthLayout (Passivo)
 * 
 * Este layout é puramente visual. Ele não decide navegação nem protege rotas.
 * Sua função é apenas centralizar e estilizar as páginas de login e signup.
 */

import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
        {children}
      </div>
    </main>
  );
}
