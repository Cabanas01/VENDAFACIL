'use client';

/**
 * @fileOverview AdminLayout
 * 
 * Este layout é aplicado a todas as rotas de /admin.
 * Ele serve como um container para o contexto administrativo.
 */

import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  );
}
