'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Loader2, 
  ArrowRight,
  ClipboardList,
  MapPin,
  User,
  History
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { CreateComandaDialog } from '@/components/comandas/create-comanda-dialog';
import type { ComandaTotalView } from '@/lib/types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandasPage() {
  const { store } = useAuth();
  const router = useRouter();
  
  const [comandas, setComandas] = useState<ComandaTotalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const fetchComandas = useCallback(async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('v_comandas_totais')
        .select('*')
        .eq('store_id', store.id)
        .eq('status', 'aberta')
        .order('numero', { ascending: true });

      if (error) throw error;
      setComandas(data || []);
    } catch (err) {
      console.error('[FETCH_COMANDAS_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    if (!store?.id) return;
    fetchComandas();

    // Sincronização Realtime
    const channel = supabase
      .channel('comandas_list_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comandas',
        filter: `store_id=eq.${store.id}`
      }, () => fetchComandas())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comanda_itens' 
      }, () => fetchComandas())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [store?.id, fetchComandas]);

  const filtered = comandas.filter(c => 
    c.numero.toString().includes(search) || 
    (c.mesa || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cliente_nome || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Consultando Salão...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Comandas Abertas" subtitle="Gerenciamento de consumo em tempo real.">
        <Button onClick={() => setIsNewDialogOpen(true)} className="h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Nova Comanda
        </Button>
      </PageHeader>

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
        {filtered.map(comanda => (
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

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-30 flex flex-col items-center gap-4">
            <ClipboardList className="h-12 w-12" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhuma comanda aberta no momento</p>
          </div>
        )}
      </div>

      <CreateComandaDialog 
        isOpen={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen} 
        onSuccess={fetchComandas} 
      />
    </div>
  );
}
