'use client';

/**
 * @fileOverview Gestão de Atendimento (Comandas) v6.0
 * 
 * Fila de comandas abertas com suporte a mesas e balcão.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  ArrowRight,
  ClipboardList,
  MapPin,
  User,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { CreateComandaDialog } from '@/components/comandas/create-comanda-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandasPage() {
  const { store, refreshStatus, comandas, storeStatus } = useAuth();
  const router = useRouter();
  
  const [search, setSearch] = useState('');
  const [isNewComandaOpen, setIsNewComandaOpen] = useState(false);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const filteredComandas = useMemo(() => {
    const safeComandas = Array.isArray(comandas) ? comandas : [];
    return safeComandas.filter(c => 
      c.status === 'open' && (
        c.numero?.toString().includes(search) || 
        (c.cliente_nome || '').toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [comandas, search]);

  if (storeStatus === 'loading_auth' || storeStatus === 'loading_status') {
    return (
      <div className="space-y-8 p-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Atendimento" subtitle="Gestão de comandas e mesas em tempo real.">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refreshStatus()} className="h-12 w-12 rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsNewComandaOpen(true)} className="h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" /> Abrir Comanda
          </Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border border-primary/5 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por mesa ou cliente..." 
          className="border-none shadow-none focus-visible:ring-0 h-10 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredComandas.map(comanda => (
          <Card 
            key={comanda.id} 
            className="group cursor-pointer hover:border-primary transition-all shadow-sm border-primary/5 bg-background relative overflow-hidden active:scale-[0.98]"
            onClick={() => router.push(`/comandas/${comanda.id}`)}
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="bg-muted/20 border-b py-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-3xl font-black tracking-tighter">
                  {comanda.numero === 0 ? 'Balcão' : `Mesa ${comanda.numero}`}
                </CardTitle>
                <Badge variant="outline" className="text-[8px] font-black uppercase bg-background border-primary/20 text-primary">
                  {comanda.status}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary">
                  <MapPin className="h-3 w-3" /> {comanda.numero === 0 ? 'Balcão / Direto' : `Mesa ${comanda.numero}`}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                  <User className="h-3 w-3" /> {comanda.cliente_nome || 'Consumidor'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Saldo Parcial</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(comanda.total_cents)}</p>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                  <Clock className="h-3 w-3 opacity-40" />
                  {formatDistanceToNow(parseISO(comanda.created_at), { locale: ptBR, addSuffix: false })}
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-4 flex justify-end">
              <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                Gerenciar <ArrowRight className="h-3 w-3" />
              </span>
            </CardFooter>
          </Card>
        ))}

        {filteredComandas.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[40px] opacity-30 flex flex-col items-center gap-4">
            <ClipboardList className="h-12 w-12" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhum atendimento ativo</p>
          </div>
        )}
      </div>

      <CreateComandaDialog 
        isOpen={isNewComandaOpen} 
        onOpenChange={setIsNewComandaOpen} 
        onSuccess={() => refreshStatus()} 
      />
    </div>
  );
}
