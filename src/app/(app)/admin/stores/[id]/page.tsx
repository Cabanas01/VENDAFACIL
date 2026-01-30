'use client';

/**
 * @fileOverview Detalhes da Loja (Admin Drill-down)
 * 
 * Fornece uma visão 360º de um tenant específico para o administrador.
 */

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
  TrendingUp, 
  User, 
  MapPin, 
  Lock,
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
  const [members, setMembers] = useState<any[]>([]);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [storeRes, customersRes, salesRes, membersRes] = await Promise.all([
        supabase.from('stores').select('*, users(email), store_access(*)').eq('id', id).single(),
        supabase.from('customers').select('*').eq('store_id', id).order('created_at', { ascending: false }),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', id).order('created_at', { ascending: false }),
        supabase.from('store_members').select('*, users(name, email)').eq('store_id', id)
      ]);

      if (storeRes.error) throw storeRes.error;

      setStore(storeRes.data);
      setCustomers(customersRes.data || []);
      setSales(salesRes.data || []);
      setMembers(membersRes.data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadAllData();
  }, [id]);

  const stats = useMemo(() => {
    const revenue = sales.reduce((acc, s) => acc + (s.total_cents || 0), 0);
    return { revenue, salesCount: sales.length, customersCount: customers.length };
  }, [sales, customers]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="animate-pulse font-medium">Cruzando dados do tenant...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Loja não encontrada</h2>
          <p className="text-muted-foreground">O identificador {id} não corresponde a nenhum registro ativo.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title={store.name || 'Loja sem Nome'} 
          subtitle={`Gestão administrativa da loja ${store.id}`} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-primary">Faturamento Global</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats.revenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total de Vendas</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.salesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Clientes Ativos</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customersCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Status do Acesso</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={store.store_access?.[0]?.status_acesso === 'ativo' ? 'default' : 'destructive'} className="h-7 px-3 text-xs">
              {store.store_access?.[0]?.status_acesso?.toUpperCase() || 'SEM PLANO'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border">
          <TabsTrigger value="overview">Resumo & Dados</TabsTrigger>
          <TabsTrigger value="sales">Vendas ({sales.length})</TabsTrigger>
          <TabsTrigger value="customers">Clientes ({customers.length})</TabsTrigger>
          <TabsTrigger value="access" className="text-primary font-bold">Plano & Licença</TabsTrigger>
          <TabsTrigger value="team">Equipe ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Dados do Proprietário</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">E-mail de Login</label>
                  <p className="font-medium">{store.users?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Razão Social</label>
                  <p className="font-medium">{store.legal_name || '-'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">CNPJ</label>
                  <p className="font-mono font-bold text-primary">{store.cnpj || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Localização & Contato</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Telefone</label>
                  <p className="font-medium">{store.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Endereço</label>
                  <p className="text-sm text-muted-foreground">
                    {store.address?.street}, {store.address?.number}<br/>
                    {store.address?.neighborhood} - {store.address?.city}/{store.address?.state}<br/>
                    CEP: {store.address?.cep}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Itens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.created_at ? format(new Date(s.created_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(s.total_cents || 0)}</TableCell>
                      <TableCell className="capitalize text-xs">{s.payment_method}</TableCell>
                      <TableCell className="text-xs">{s.items?.length || 0} produtos</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary" /> Acesso Atual</CardTitle>
                <CardDescription>Status do licenciamento em tempo real.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-end border-b pb-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase">Plano Ativo</p>
                    <p className="text-2xl font-black text-primary capitalize">{store.store_access?.[0]?.plano_tipo || 'Nenhum'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-bold uppercase">Expiração</p>
                    <p className="font-bold">
                      {store.store_access?.[0]?.data_fim_acesso 
                        ? format(new Date(store.store_access[0].data_fim_acesso), 'dd/MM/yyyy') 
                        : '-'}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => setIsGrantDialogOpen(true)}>
                    <Unlock className="h-4 w-4 mr-2" /> Conceder Plano
                  </Button>
                  <Button variant="destructive" className="flex-1">
                    <Lock className="h-4 w-4 mr-2" /> Bloquear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg font-bold">Metadados SaaS</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origem da Licença:</span>
                  <span className="font-bold uppercase text-xs">{store.store_access?.[0]?.origem || 'Manual'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Interno do Tenant:</span>
                  <span className="font-mono text-[10px]">{store.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data de Criação:</span>
                  <span className="font-bold">{store.created_at ? format(new Date(store.created_at), 'dd/MM/yyyy') : '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Vínculo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-bold">{m.users?.name || 'Membro sem nome'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.users?.email || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] uppercase">{m.role}</Badge></TableCell>
                      <TableCell className="text-xs">{m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy') : '-'}</TableCell>
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
        onSuccess={loadAllData}
      />
    </div>
  );
}
