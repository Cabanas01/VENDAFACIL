
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Loader2, 
  ArrowRight,
  ClipboardList,
  MapPin,
  User,
  QrCode,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { CreateComandaDialog } from '@/components/comandas/create-comanda-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ComandaTotalView, TableInfo } from '@/lib/types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandasPage() {
  const { store } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [comandas, setComandas] = useState<ComandaTotalView[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!store?.id) return;
    try {
      const [comandasRes, tablesRes] = await Promise.all([
        supabase
          .from('v_comandas_totais')
          .select('*')
          .eq('store_id', store.id)
          .eq('status', 'aberta')
          .order('numero', { ascending: true }),
        supabase
          .from('tables')
          .select('*')
          .eq('store_id', store.id)
          .order('table_number', { ascending: true })
      ]);

      if (comandasRes.error) throw comandasRes.error;
      setComandas(comandasRes.data || []);
      setTables(tablesRes.data || []);
    } catch (err) {
      console.error('[FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    if (!store?.id) return;
    fetchData();

    const channel = supabase
      .channel('comandas_global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas', filter: `store_id=eq.${store.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [store?.id, fetchData]);

  const filteredComandas = comandas.filter(c => 
    c.numero.toString().includes(search) || 
    (c.mesa || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cliente_nome || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyLink = (token: string) => {
    if (!store?.id) return;
    const url = `${window.location.origin}/m/${store.id}/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copiado!',
      description: 'O link do cardápio digital desta mesa está na sua área de transferência.',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Salão...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Gestão de Atendimento" subtitle="Comandas abertas e links de autoatendimento.">
        <Button onClick={() => setIsNewDialogOpen(true)} className="h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Nova Comanda
        </Button>
      </PageHeader>

      <Tabs defaultValue="abertas" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="abertas" className="rounded-lg font-black uppercase text-[10px] tracking-widest px-6">Comandas Abertas</TabsTrigger>
          <TabsTrigger value="links" className="rounded-lg font-black uppercase text-[10px] tracking-widest px-6">Links p/ Clientes (QR)</TabsTrigger>
        </TabsList>

        <TabsContent value="abertas" className="space-y-6 m-0">
          <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border border-primary/5 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground ml-2" />
            <Input 
              placeholder="Filtrar por mesa, comanda ou nome do cliente..." 
              className="border-none shadow-none focus-visible:ring-0 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredComandas.map(comanda => (
              <Card 
                key={comanda.comanda_id} 
                className="group cursor-pointer hover:border-primary transition-all shadow-sm border-primary/5 bg-background relative overflow-hidden"
                onClick={() => router.push(`/comandas/${comanda.comanda_id}`)}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="bg-muted/20 border-b py-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-3xl font-black tracking-tighter">#{comanda.numero}</CardTitle>
                    <Badge variant="outline" className="text-[8px] font-black uppercase bg-background border-primary/20">Aberta</Badge>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary">
                      <MapPin className="h-3 w-3" /> {comanda.mesa || 'Sem mesa'}
                    </div>
                    {comanda.cliente_nome && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                        <User className="h-3 w-3" /> {comanda.cliente_nome}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Total Acumulado</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(comanda.total)}</p>
                </CardContent>
                <CardFooter className="pt-0 pb-4 flex justify-end">
                  <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    Gerenciar <ArrowRight className="h-3 w-3" />
                  </span>
                </CardFooter>
              </Card>
            ))}

            {filteredComandas.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-30 flex flex-col items-center gap-4">
                <ClipboardList className="h-12 w-12" />
                <p className="text-sm font-black uppercase tracking-widest">Nenhuma comanda aberta no momento</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="links" className="m-0">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b py-6 px-8">
              <CardTitle className="flex items-center gap-3 text-xl font-headline font-black uppercase tracking-tighter">
                <QrCode className="h-6 w-6 text-primary" /> Links do Cardápio Digital
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">Envie esses links para os clientes ou gere QR Codes para as mesas.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid divide-y">
                {tables.map(table => (
                  <div key={table.id} className="p-6 flex items-center justify-between hover:bg-muted/20 transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-2xl bg-background border flex items-center justify-center font-black text-lg shadow-sm">
                        {table.table_number}
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight">Mesa {table.table_number}</h4>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase opacity-60">{table.table_token}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="font-black text-[10px] uppercase tracking-widest h-10 px-4" onClick={() => handleCopyLink(table.table_token)}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Copiar Link
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-primary" onClick={() => window.open(`/m/${store?.id}/${table.table_token}`, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {tables.length === 0 && (
                  <div className="py-24 text-center text-muted-foreground space-y-4">
                    <QrCode className="h-12 w-12 mx-auto opacity-10" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma mesa cadastrada para esta loja.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateComandaDialog 
        isOpen={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen} 
        onSuccess={fetchData} 
      />
    </div>
  );
}
