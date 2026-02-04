
'use client';

/**
 * @fileOverview Gestão de Atendimento e Autoatendimento (QR Code).
 * Corrigido para garantir redirecionamento via UUID real da comanda.
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
  HelpCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { CreateComandaDialog } from '@/components/comandas/create-comanda-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
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
  const [isNewComandaOpen, setIsNewComandaOpen] = useState(false);
  const [isNewTableOpen, setIsNewTableOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  const fetchData = useCallback(async () => {
    if (!store?.id) return;
    try {
      const [comandasRes, tablesRes] = await Promise.all([
        supabase
          .from('v_comandas_totais')
          .select('id, store_id, numero, mesa, status, total, cliente_nome')
          .eq('store_id', store.id)
          .eq('status', 'aberta')
          .order('numero', { ascending: true }),
        supabase
          .from('tables')
          .select('id, store_id, number, status, public_token')
          .eq('store_id', store.id)
          .order('number', { ascending: true })
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `store_id=eq.${store.id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [store?.id, fetchData]);

  const filteredComandas = useMemo(() => 
    comandas.filter(c => 
      c.numero?.toString().includes(search) || 
      (c.mesa || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.cliente_nome || '').toLowerCase().includes(search.toLowerCase())
    )
  , [comandas, search]);

  const handleManageComanda = (comanda: ComandaTotalView) => {
    if (!comanda.id) {
      toast({
        variant: 'destructive',
        title: 'Erro de Identificação',
        description: 'Não foi possível localizar o código interno desta comanda.'
      });
      return;
    }
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

      toast({ title: 'Mesa Ativada!', description: `Mesa ${newTableNumber} agora possui link digital.` });
      setNewTableNumber('');
      setIsNewTableOpen(false);
      await fetchData();
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
    toast({
      title: 'Link Copiado!',
      description: 'Pronto para enviar ao cliente ou imprimir QR Code.',
    });
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Excluir esta mesa e seu link de acesso?')) return;
    try {
      await supabase.from('tables').delete().eq('id', id);
      toast({ title: 'Mesa removida.' });
      await fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: err.message });
    }
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
        <Button onClick={() => setIsNewComandaOpen(true)} className="h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
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
            {filteredComandas.map(comanda => {
              const mesaNum = comanda.mesa?.replace(/\D/g, '');
              const linkedTable = tables.find(t => t.number.toString() === mesaNum);

              return (
                <Card 
                  key={comanda.id} 
                  className="group cursor-pointer hover:border-primary transition-all shadow-sm border-primary/5 bg-background relative overflow-hidden"
                  onClick={() => handleManageComanda(comanda)}
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
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Acumulado</p>
                        <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(comanda.total)}</p>
                      </div>
                      
                      {linkedTable && (
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-primary hover:bg-primary/10" 
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(linkedTable.public_token); }}
                            title="Copiar Link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4 flex justify-end">
                    <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      Gerenciar <ArrowRight className="h-3 w-3" />
                    </span>
                  </CardFooter>
                </Card>
              );
            })}

            {filteredComandas.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-30 flex flex-col items-center gap-4">
                <ClipboardList className="h-12 w-12" />
                <p className="text-sm font-black uppercase tracking-widest">Nenhuma comanda aberta no momento</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="links" className="m-0 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-primary/5 p-6 rounded-2xl border border-primary/10 gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" /> Autoatendimento Digital
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Configure mesas e QR Codes para permitir pedidos digitais.
              </p>
            </div>
            <Button onClick={() => setIsNewTableOpen(true)} size="sm" className="h-10 font-black uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" /> Cadastrar Mesa
            </Button>
          </div>

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
                      <div className="overflow-hidden">
                        <h4 className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                          Mesa #{table.number}
                          <Badge variant="secondary" className="h-4 text-[8px] font-black uppercase bg-green-50 text-green-600 border-green-100">
                            {table.status}
                          </Badge>
                        </h4>
                        <div className="flex items-center gap-2 mt-1 opacity-60 group-hover:opacity-100 transition-opacity overflow-hidden">
                          <Link2 className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-[10px] font-mono text-muted-foreground truncate">.../m/{store?.id?.substring(0,8)}/{table.public_token?.substring(0,10)}...</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <Button variant="outline" size="sm" className="h-10 px-4 font-black uppercase text-[9px] tracking-[0.15em] border-primary/10 hover:bg-primary hover:text-white transition-all" onClick={() => handleCopyLink(table.public_token)}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Copiar Link
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-primary hover:bg-primary/10" 
                        onClick={() => window.open(`/m/${store?.id}/${table.public_token}`, '_blank')}
                        title="Visualizar como Cliente"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/5" 
                        onClick={() => handleDeleteTable(table.id)}
                        title="Excluir Mesa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {tables.length === 0 && (
              <div className="py-32 text-center border-2 border-dashed rounded-[40px] opacity-20 flex flex-col items-center gap-4">
                <QrCode className="h-16 w-16 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-[0.2em]">Nenhuma mesa com link digital</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isNewTableOpen} onOpenChange={setIsNewTableOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Cadastrar Mesa Digital</DialogTitle>
            <DialogDescription>Gere um link de acesso automático para uma nova mesa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número da Mesa Física</label>
              <Input 
                type="number" 
                placeholder="Ex: 10" 
                className="h-14 text-2xl font-black text-center" 
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                autoFocus
              />
            </div>
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-primary uppercase leading-relaxed">
                O sistema gerará um token de segurança exclusivo. O public_token será usado no QR Code.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:flex-row-reverse">
            <Button onClick={handleCreateTable} disabled={!newTableNumber || isCreatingTable} className="flex-1 h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
              {isCreatingTable ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <QrCode className="mr-2 h-4 w-4" />} Ativar Mesa
            </Button>
            <Button variant="ghost" onClick={() => setIsNewTableOpen(false)} className="flex-1 h-12 font-black uppercase text-xs tracking-widest">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateComandaDialog 
        isOpen={isNewComandaOpen} 
        onOpenChange={setIsNewComandaOpen} 
        onSuccess={fetchData} 
      />
    </div>
  );
}
