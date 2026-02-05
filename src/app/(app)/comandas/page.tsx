
'use client';

/**
 * @fileOverview Gestão de Comandas.
 * Ajustado para consumir estritamente o status 'aberta' do backend real.
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
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { CreateComandaDialog } from '@/components/comandas/create-comanda-dialog';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((val || 0) / 100);

export default function ComandasPage() {
  const { store, refreshStatus, comandas } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNewComandaOpen, setIsNewComandaOpen] = useState(false);

  useEffect(() => {
    refreshStatus().finally(() => setLoading(false));
  }, [refreshStatus]);

  // Filtro alinhado ao novo schema (status 'aberta')
  const filteredComandas = useMemo(() => 
    comandas.filter(c => 
      c.status === 'aberta' && (
        c.numero?.toString().includes(search) || 
        (c.mesa || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.cliente_nome || '').toLowerCase().includes(search.toLowerCase())
      )
    )
  , [comandas, search]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Atendimento" subtitle="Gestão de comandas e mesas em tempo real.">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refreshStatus()} disabled={loading} className="h-12 w-12 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsNewComandaOpen(true)} className="h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" /> Abrir Comanda
          </Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border border-primary/5 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por número, mesa ou nome do cliente..." 
          className="border-none shadow-none focus-visible:ring-0 h-10 text-base"
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
            className="group cursor-pointer hover:border-primary transition-all shadow-sm border-primary/5 bg-background relative overflow-hidden active:scale-[0.98]"
            onClick={() => router.push(`/comandas/${comanda.id}`)}
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="bg-muted/20 border-b py-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-3xl font-black tracking-tighter">#{comanda.numero}</CardTitle>
                <Badge variant="outline" className="text-[8px] font-black uppercase bg-background border-primary/20 text-primary">
                  {comanda.status}
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
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Total Acumulado</p>
              <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(comanda.total_cents)}</p>
            </CardContent>
            <CardFooter className="pt-0 pb-4 flex justify-end">
              <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                Gerenciar Atendimento <ArrowRight className="h-3 w-3" />
              </span>
            </CardFooter>
          </Card>
        ))}

        {!loading && filteredComandas.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[40px] opacity-30 flex flex-col items-center gap-4">
            <ClipboardList className="h-12 w-12" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhuma comanda aberta no momento</p>
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
