'use client';

/**
 * @fileOverview Detalhes da Loja (Admin)
 * 
 * Exibição gerencial com datas de expiração completas.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Activity,
  CreditCard
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GrantPlanDialog } from '../../grant-plan-dialog';
import { useToast } from '@/hooks/use-toast';
import { getPlanLabel } from '@/lib/plan-label';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

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
      <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">Sincronizando com o servidor...</p>
    </div>
  );

  const faturamentoTotal = sales.reduce((acc, s) => acc + (s.total_cents || 0), 0);
  const access = store.store_access?.[0];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex items-start gap-6">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full h-10 w-10 mt-1 hover:bg-primary/10 transition-colors" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter uppercase font-headline leading-none">{store.name || 'Loja sem Nome'}</h1>
          <p className="text-sm text-muted-foreground font-bold flex items-center gap-2">
            Gestão administrativa da unidade <span className="font-mono bg-muted px-2 py-0.5 rounded text-[10px] uppercase">{store.id}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-background">
          <CardHeader className="pb-2">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Faturamento Total</p>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{formatCurrency(faturamentoTotal)}</div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-background">
          <CardHeader className="pb-2">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Clientes Cadastrados</p>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{customersCount}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-background">
          <CardHeader className="pb-2">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Volume de Vendas</p>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{sales.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="access" className="space-y-8">
        <TabsList className="bg-transparent border-b border-muted w-full justify-start rounded-none h-auto p-0 gap-8">
          <TabsTrigger value="overview" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-[11px] uppercase tracking-widest">Informações Gerais</TabsTrigger>
          <TabsTrigger value="access" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-[11px] uppercase tracking-widest">Plano & Licença</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-[11px] uppercase tracking-widest">Atividade Recente</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="animate-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/5 bg-background shadow-sm">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2 font-black uppercase tracking-wider text-muted-foreground"><User className="h-4 w-4 text-primary" /> Proprietário</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-xl border border-primary/5">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">E-mail de Login</label>
                    <p className="font-black text-sm">{store.users?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl border border-primary/5">
                  <label className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">CNPJ Registrado</label>
                  <p className="font-mono font-black text-base">{store.cnpj || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/5 bg-background shadow-sm">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2 font-black uppercase tracking-wider text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Localização</CardTitle></CardHeader>
              <CardContent>
                <div className="p-5 bg-muted/30 rounded-xl border border-primary/5 space-y-4">
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Logradouro</label>
                    <p className="text-sm font-black leading-relaxed">
                      {store.address?.street}, {store.address?.number}
                    </p>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Bairro e Cidade</label>
                    <p className="text-sm font-black leading-relaxed">
                      {store.address?.neighborhood} - {store.address?.city}/{store.address?.state}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-primary/5">
                    <span className="text-[10px] text-muted-foreground font-black uppercase">CEP: {store.address?.cep}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="access" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-primary/20 bg-primary/5 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-primary/10 bg-primary/10 py-6">
              <CardTitle className="flex items-center gap-3 text-xl font-headline font-black uppercase tracking-tighter">
                <ShieldCheck className="h-7 w-7 text-primary" /> 
                Status do Licenciamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-12 py-10 px-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2">Plano Atribuído</p>
                  <p className="text-6xl font-black text-primary uppercase tracking-tighter">
                    {getPlanLabel(access?.plano_tipo) || 'Sem Plano'}
                  </p>
                </div>
                <div className="text-left md:text-right space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2">Data de Expiração</p>
                  <p className="text-2xl font-black text-foreground uppercase tracking-tight">
                    {access?.data_fim_acesso 
                      ? format(parseISO(access.data_fim_acesso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : '---'}
                  </p>
                  <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest border-primary/20 bg-background">
                    Status: {access?.status_acesso || 'Inativo'}
                  </Badge>
                </div>
              </div>
              
              <Button 
                className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95" 
                onClick={() => setIsGrantDialogOpen(true)}
              >
                <Unlock className="h-5 w-5 mr-3" /> Alterar Acesso Manualmente
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-sm bg-background">
            <CardHeader className="flex flex-row items-center justify-between border-b border-muted/20 pb-4">
              <CardTitle className="text-base flex items-center gap-2 font-black uppercase tracking-tight"><Activity className="h-5 w-5 text-primary" /> Últimas 50 Vendas</CardTitle>
              <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest">{sales.length} Registros</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-black px-6">Data/Hora</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-black px-6">Total da Venda</TableHead>
                      <TableHead className="text-center text-[10px] uppercase font-black px-6">Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(s => (
                      <TableRow key={s.id} className="hover:bg-primary/5 transition-colors border-b border-muted/10">
                        <TableCell className="text-[11px] font-black uppercase tracking-tight px-6">
                          {format(new Date(s.created_at), 'dd/MM/yy HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-right font-black text-primary text-base px-6">
                          {formatCurrency(s.total_cents)}
                        </TableCell>
                        <TableCell className="text-center px-6">
                          <Badge variant="secondary" className="capitalize text-[9px] font-black bg-muted/50 text-muted-foreground border-none">
                            <CreditCard className="h-3 w-3 mr-1" /> {s.payment_method}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-24 text-muted-foreground font-black uppercase text-xs tracking-[0.2em] italic">
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
