'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Terminal } from 'lucide-react';

import AdminDashboard from './dashboard';
import AdminUsers from './users';
import AdminStores from './stores';
import AdminSales from './sales';
import AdminCash from './cash';
import AdminLogs from './logs';
import AdminCustomers from './customers';
import AdminBilling from './billing';
import AdminAnalytics from './analytics';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    async function validateAdminSession() {
      setLoading(true);
      setErrorMsg(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMsg(`Erro ao validar sessão: ${authError?.message || 'Acesso negado. Faça login para continuar.'}`);
        setLoading(false);
        return;
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        setErrorMsg(`Erro ao verificar permissões: ${profileError.message}`);
        setLoading(false);
        return;
      }
      
      if (!profile?.is_admin) {
        setErrorMsg('Acesso negado. Você não tem permissão para acessar esta página.');
        setLoading(false);
        return;
      }

      setIsVerifiedAdmin(true);
      setLoading(false);
    }

    validateAdminSession();
  }, []);
  
  const handleTabChange = (value: string) => {
    router.push(`/admin?tab=${value}`, { scroll: false });
  };

  if (loading) {
    return (
       <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-[750px]" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (errorMsg || !isVerifiedAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Painel Administrativo" />
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            {errorMsg || 'Você não tem permissão para acessar esta página.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Painel Administrativo" subtitle="Gerenciamento geral do sistema e dados." />

      <Tabs value={activeTab} className="space-y-4" onValueChange={handleTabChange}>
        <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="stores">Lojas</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="customers">Clientes (Global)</TabsTrigger>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="cash">Caixas</TabsTrigger>
            <TabsTrigger value="billing">Faturamento</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
        <TabsContent value="stores"><AdminStores /></TabsContent>
        <TabsContent value="users"><AdminUsers /></TabsContent>
        <TabsContent value="customers"><AdminCustomers /></TabsContent>
        <TabsContent value="sales"><AdminSales /></TabsContent>
        <TabsContent value="cash"><AdminCash /></TabsContent>
        <TabsContent value="billing"><AdminBilling /></TabsContent>
        <TabsContent value="analytics"><AdminAnalytics /></TabsContent>
        <TabsContent value="logs"><AdminLogs /></TabsContent>
    </Tabs>
    </div>
  );
}
