'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Terminal } from 'lucide-react';

import AdminUsers from './users';
import AdminStores from './stores';
import AdminSales from './sales';
import AdminCash from './cash';
import AdminLogs from './logs';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);

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
          <Skeleton className="h-10 w-[450px]" />
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

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="stores">Lojas</TabsTrigger>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="cash">Caixas</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><AdminUsers /></TabsContent>
        <TabsContent value="stores"><AdminStores /></TabsContent>
        <TabsContent value="sales"><AdminSales /></TabsContent>
        <TabsContent value="cash"><AdminCash /></TabsContent>
        <TabsContent value="logs"><AdminLogs /></TabsContent>
    </Tabs>
    </div>
  );
}
