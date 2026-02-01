
'use client';

import { useEffect, useState } from 'react';
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
  User, 
  MapPin, 
  Unlock,
  Loader2,
  ShieldCheck,
  Mail,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { GrantPlanDialog } from '../../grant-plan-dialog';
import { useToast } from '@/hooks/use-toast';
import { getPlanLabel } from '@/lib/plan-label';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

export default function AdminStoreDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [customersCount, setCustomersCount] = useState(0);
  const [sales, setSales] = useState<any[]>([]);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storeRes, customersRes, salesRes] = await Promise.all([
        supabase.from('stores').select('*, users(email), store_access(*)').eq('id', id).single(),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('store_id', id),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', id).order('created_at', { ascending: false })
      ]);

      if (storeRes.error) throw storeRes.error;

      setStore(storeRes.data);
      setCustomersCount(customersRes.count || 0);
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

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm font-bold uppercase tracking-tighter">Sincronizando com o servidor...</p>
    </div>
  );

  const faturamentoTotal = sales.reduce((acc, s) => acc + (s.total_cents || 0), 0);
  const volumeVendas = sales.length;
  const access = store.store_access?.[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase font-headline">{store.name || 'Loja sem Nome'}</h1>
          <p className="text-sm text-muted-foreground font-bold">Gestão administrativa da unidade <span className="font-mono">{store.id}</span></p>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{formatCurrency(faturamentoTotal)}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Volume de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{volumeVendas}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Clientes Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{customersCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="access" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="font-bold text-xs uppercase px-6">Informações Gerais</TabsTrigger>
          <TabsTrigger value="access" className="font-bold text-xs uppercase px-6">Plano & Licença</TabsTrigger>
          <TabsTrigger value="activity" className="font-bold text-xs uppercase px-6">Atividade Recente</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="animate-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2 font-headline"><User className="h-5 w-5 text-primary" /> Proprietário</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg border border-primary/5">
                  <Mail className="h-4 w-4 text-primary" />
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-black">E-mail de Login</label>
                    <p className="font-bold text-sm">{store.users?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-primary/5">
                  <label className="text-[10px] text-muted-foreground uppercase font-black">CNPJ Registrado</label>
                  <p className="font-mono font-bold text-sm">{store.cnpj || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2 font-headline"><MapPin className="h-5 w-5 text-primary" /> Localização</CardTitle></CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/30 rounded-lg border border-primary/5">
                  <p className="text-sm font-bold leading-relaxed">
                    {store.address?.street}, {store.address?.number}<br/>
                    {store.address?.neighborhood} - {store.address?.city}/{store.address?.state}<br/>
                    <span className="text-xs text-muted-foreground font-mono">CEP: {store.address?.cep}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="access" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-primary/20 bg-muted/5 shadow-lg">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="flex items-center gap-2 text-xl font-headline font-black">
                <ShieldCheck className="h-6 w-6 text-primary" /> 
                Status do Licenciamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-10 py-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Plano Atual</p>
                  <p className="text-4xl font-black text-primary uppercase tracking-tighter">
                    {getPlanLabel(access?.plano_tipo) || 'Sem Plano'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Expiração</p>
                  <p className="text-xl font-black">
                    {access?.data_fim_acesso 
                      ? format(new Date(access.data_fim_acesso), 'dd/MM/yyyy') 
                      : '-'}
                  </p>
                </div>
              </div>
              
              <Button 
                className="w-full h-14 text-lg font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]" 
                onClick={() => setIsGrantDialogOpen(true)}
              >
                <Unlock className="h-5 w-5 mr-3" /> Alterar Acesso Manualmente
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Últimas 50 Vendas</CardTitle>
              <Badge variant="outline" className="font-bold">{sales.length} Registros</Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-black">Data/Hora</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-black">Total</TableHead>
                      <TableHead className="text-center text-[10px] uppercase font-black">Método</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(s => (
                      <TableRow key={s.id} className="hover:bg-muted/5">
                        <TableCell className="text-[11px] font-bold">
                          {format(new Date(s.created_at), 'dd/MM/yy HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-right font-black text-primary">
                          {formatCurrency(s.total_cents)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="capitalize text-[9px] font-black">{s.payment_method}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-20 text-muted-foreground font-bold italic">
                          Nenhuma transação registrada nesta unidade.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
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
