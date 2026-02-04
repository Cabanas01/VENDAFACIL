
'use client';

/**
 * @fileOverview Gestão de Atendimento e Autoatendimento (QR Code).
 * Ajustado para usar o mapa oficial de status: aberta, em_preparo, pronta, aguardando_pagamento, fechada.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  ExternalLink,
  Trash2,
  Sparkles,
  Link2,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { CreateComandaDialog } from '@/components/comandas/create-comanda-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { ComandaTotalView, TableInfo } from '@/lib/types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandasPage() {
  const { store } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [comandas, setComandas] = useState<ComandaTotalView[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('abertas');
  
  const [isNewComandaOpen, setIsNewComandaOpen] = useState(false);
  const [isNewTableOpen, setIsNewTableOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!store?.id) return;
    if (!silent) setLoading(true);

    try {
      // Filtramos por comandas que NÃO estão fechadas nem canceladas
      const comandasQuery = supabase
        .from('v_comandas_totais')
        .select('*')
        .eq('store_id', store.id)
        .in('status', ['aberta', 'em_preparo', 'pronta', 'aguardando_pagamento'])
        .order('numero', { ascending: true });

      const tablesQuery = supabase
        .from('tables')
        .select('*')
        .eq('store_id', store.id)
        .order('number', { ascending: true });

      const [comandasRes, tablesRes] = await Promise.all([comandasQuery, tablesQuery]);

      setComandas(comandasRes.data || []);
      setTables(tablesRes.data || []);
    } catch (err) {
      console.error('[FETCH_FATAL]', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    if (store?.id) {
      fetchData();

      const channel = supabase
        .channel('comandas_global_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas', filter: `store_id=eq.${store.id}` }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_itens' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `store_id=eq.${store.id}` }, () => fetchData(true))
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [store?.id, fetchData]);

  const filteredComandas = useMemo(() => 
    comandas.filter(c => 
      c.numero?.toString().includes(search) || 
      (c.mesa || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.cliente_nome || '').toLowerCase().includes(search.toLowerCase())
    )
  , [comandas, search]);

  const handleManageComanda = (comanda: ComandaTotalView) => {
    if (!comanda.id) return;
    router.push(`/comandas/${comanda.id}`);
  };

  const handleCreateTable = async () => {
    if (!store?.id || !newTableNumber || isCreatingTable) return;
    setIsCreatingTable(true);

    try {
      const { error } = await supabase.rpc('create_table', {
        p_store_id: store.id,
        p_number: parseInt(newTableNumber)
      });

      if (error) throw error;

      toast({ title: 'Mesa Ativada!' });
      setNewTableNumber('');
      setIsNewTableOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao cadastrar', description: err.message });
    } finally {
      setIsCreatingTable(false);
    }
  };

  const handleCopyLink = (token: string) => {
    if (!store?.id || !token) return;
    const url = `${window.location.origin}/m/${store.id}/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link Copiado!' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Atendimento" subtitle="Gestão de comandas e mesas.">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading} className="h-12 w-12 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsNewComandaOpen(true)} className="h-12 font-black uppercase text-xs tracking-widest">
            <Plus className="h-4 w-4 mr-2" /> Nova Comanda
          </Button>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="abertas" className="rounded-lg font-black uppercase text-[10px] tracking-widest px-6">Em Aberto</TabsTrigger>
          <TabsTrigger value="links" className="rounded-lg font-black uppercase text-[10px] tracking-widest px-6">Mesas (QR Code)</TabsTrigger>
        </TabsList>

        <TabsContent value="abertas" className="space-y-6 m-0">
          <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border border-primary/5 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground ml-2" />
            <Input 
              placeholder="Buscar..." 
              className="border-none shadow-none focus-visible:ring-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
            ) : filteredComandas.map(comanda => (
              <Card 
                key={comanda.id} 
                className="group cursor-pointer hover:border-primary transition-all shadow-sm border-primary/5 bg-background relative overflow-hidden"
                onClick={() => handleManageComanda(comanda)}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="bg-muted/20 border-b py-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-3xl font-black tracking-tighter">#{comanda.numero}</CardTitle>
                    <Badge variant={comanda.status === 'aguardando_pagamento' ? 'destructive' : 'outline'} className="text-[8px] font-black uppercase bg-background border-primary/20">
                      {comanda.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary">
                      <MapPin className="h-3 w-3" /> {comanda.mesa || 'Balcão'}
                    </div>
                    {comanda.cliente_nome && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                        <User className="h-3 w-3" /> {comanda.cliente_nome}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Total</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(comanda.total)}</p>
                </CardContent>
                <CardFooter className="pt-0 pb-4 flex justify-end">
                  <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                    Gerenciar <ArrowRight className="h-3 w-3" />
                  </span>
                </CardFooter>
              </Card>
            ))}

            {!loading && filteredComandas.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-30 flex flex-col items-center gap-4">
                <ClipboardList className="h-12 w-12" />
                <p className="text-sm font-black uppercase tracking-widest">Nenhuma comanda aberta</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="links" className="m-0 space-y-6">
          <div className="grid gap-4">
            {tables.map(table => (
              <Card key={table.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                    <div className="flex items-center gap-6 w-full">
                      <div className="h-14 w-14 rounded-2xl bg-muted/30 border-2 border-dashed border-primary/20 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] font-black uppercase opacity-40">Mesa</span>
                        <span className="text-xl font-black">{table.number}</span>
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight">Mesa #{table.number}</h4>
                        <span className="text-[10px] font-mono text-muted-foreground opacity-60">Digital Ativo</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <Button variant="outline" size="sm" className="h-10 px-4 font-black uppercase text-[9px] tracking-[0.15em]" onClick={() => handleCopyLink(table.public_token)}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Copiar Link
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-primary" 
                        onClick={() => window.open(`/m/${store?.id}/${table.public_token}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CreateComandaDialog 
        isOpen={isNewComandaOpen} 
        onOpenChange={setIsNewComandaOpen} 
        onSuccess={() => fetchData(true)} 
      />
    </div>
  );
}
