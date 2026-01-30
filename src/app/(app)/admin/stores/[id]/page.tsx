
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Users, 
  ShoppingCart, 
  ShieldCheck, 
  User, 
  MapPin, 
  Unlock,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { GrantPlanDialog } from '../../grant-plan-dialog';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

export default function AdminStoreDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storeRes, customersRes, salesRes] = await Promise.all([
        supabase.from('stores').select('*, users(email), store_access(*)').eq('id', id).single(),
        supabase.from('customers').select('*').eq('store_id', id).order('created_at', { ascending: false }),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', id).order('created_at', { ascending: false })
      ]);

      if (storeRes.error) throw storeRes.error;

      setStore(storeRes.data);
      setCustomers(customersRes.data || []);
      setSales(salesRes.data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title={store.name || 'Loja sem Nome'} 
          subtitle={`Gestão administrativa da unidade ${store.id}`} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Faturamento Total</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(sales.reduce((acc, s) => acc + s.total_cents, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Volume de Vendas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{sales.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Clientes Cadastrados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{customers.length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Informações Gerais</TabsTrigger>
          <TabsTrigger value="access">Plano & Licença</TabsTrigger>
          <TabsTrigger value="activity">Atividade Recente</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Proprietário</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">E-mail de Login</label>
                  <p className="font-medium">{store.users?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">CNPJ</label>
                  <p className="font-mono">{store.cnpj || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5" /> Localização</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">
                  {store.address?.street}, {store.address?.number}<br/>
                  {store.address?.neighborhood} - {store.address?.city}/{store.address?.state}<br/>
                  CEP: {store.address?.cep}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="access">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary" /> Status do Licenciamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-end border-b pb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Plano Atual</p>
                  <p className="text-2xl font-black text-primary capitalize">{store.store_access?.[0]?.plano_tipo || 'Sem Plano'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Expiração</p>
                  <p className="font-bold">
                    {store.store_access?.[0]?.data_fim_acesso 
                      ? format(new Date(store.store_access[0].data_fim_acesso), 'dd/MM/yyyy') 
                      : '-'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => setIsGrantDialogOpen(true)}>
                  <Unlock className="h-4 w-4 mr-2" /> Alterar Acesso Manualmente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle>Últimas 50 Vendas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{format(new Date(s.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(s.total_cents)}</TableCell>
                      <TableCell className="capitalize text-xs">{s.payment_method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GrantPlanDialog 
        store={store}
        isOpen={isGrantDialogOpen}
        onOpenChange={setIsGrantDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
