'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, store, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!store && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    if (store && pathname === '/onboarding') {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, store, pathname, router]);

  // enquanto carrega auth
  if (loading) {
    return (
      <div className="flex min-h-screen w-full">
        <div className="w-64 border-r p-4">
          <Skeleton className="h-12 w-full mb-8" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="flex-1 p-8">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // enquanto redireciona, não renderiza nada
  if (!isAuthenticated) return null;
  if (!store && pathname !== '/onboarding') return null;

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
