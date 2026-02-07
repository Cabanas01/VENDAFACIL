'use client';

/**
 * @fileOverview Gestão de Caixa v6.1.
 * Corrigido nome da tabela para cash_registers e sincronização global.
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Wallet, 
  CircleDollarSign, 
  Clock, 
  Lock, 
  History, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function CaixaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { store, cashSessions, refreshStatus, storeStatus } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');

  // Localizar sessão aberta no estado global
  const openSession = useMemo(() => 
    (cashSessions || []).find(s => s.status === 'open'), 
  [cashSessions]);

  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id || !openingAmount) return;

    setLoading(true);
    try {
      const amountCents = Math.round(Number(openingAmount.replace(',', '.')) * 100);
      
      const { error } = await supabase.from('cash_registers').insert({
        store_id: store.id,
        opening_amount_cents: amountCents,
        status: 'open',
        opened_at: new Date().toISOString()
      });

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Caixa aberto com fundo inicial de ' + formatCurrency(amountCents) });
      setOpeningAmount('');
      await refreshStatus();
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao abrir caixa', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openSession || !closingAmount) return;

    setLoading(true);
    try {
      const finalCents = Math.round(Number(closingAmount.replace(',', '.')) * 100);

      const { error } = await supabase
        .from('cash_registers')
        .update({
          closing_amount_cents: finalCents,
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', openSession.id);

      if (error) throw error;

      toast({ title: 'Caixa Fechado', description: 'Turno encerrado com sucesso.' });
      setClosingAmount('');
      await refreshStatus();
      router.push('/dashboard');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao fechar caixa', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (storeStatus === 'loading_auth' || storeStatus === 'loading_status') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground animate-pulse">Sincronizando Terminal de Caixa...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Fluxo de Caixa" subtitle="Gestão financeira e controle de turno." />

      <div className="grid gap-8 md:grid-cols-2">
        {!openSession ? (
          <Card className="border-none shadow-xl rounded-[32px] overflow-hidden">
            <div className="bg-primary/5 p-10 text-center border-b">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-white flex items-center justify-center shadow-sm border border-primary/10 mb-6">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black font-headline uppercase tracking-tighter">Abertura de Turno</CardTitle>
              <CardDescription className="font-medium mt-2">Inicie a operação informando o fundo inicial disponível.</CardDescription>
            </div>
            <CardContent className="p-10">
              <form onSubmit={handleAbrirCaixa} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor do Fundo Inicial (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">R$</span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0,00" 
                      className="h-16 pl-12 text-2xl font-black border-primary/10 shadow-inner rounded-2xl"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-16 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 rounded-2xl" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <CircleDollarSign className="mr-2 h-5 w-5" />}
                  Abrir Caixa Agora
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-xl rounded-[32px] overflow-hidden">
            <div className="bg-green-500/5 p-10 text-center border-b border-green-500/10">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-white flex items-center justify-center shadow-sm border border-green-500/20 mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-3xl font-black font-headline uppercase tracking-tighter text-green-900">Operação Ativa</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 uppercase font-black text-[9px]">Aberto</Badge>
                <span className="text-xs font-bold text-green-700/60">desde {openSession.opened_at ? format(parseISO(openSession.opened_at), "HH:mm 'de' dd/MM") : '--:--'}</span>
              </div>
            </div>
            <CardContent className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-2xl border border-primary/5">
                  <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Fundo Inicial</p>
                  <p className="text-xl font-black">{formatCurrency(openSession.opening_amount_cents)}</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[9px] font-black uppercase text-primary mb-1">Status</p>
                  <p className="text-xl font-black text-primary uppercase">Ativo</p>
                </div>
              </div>

              <form onSubmit={handleFecharCaixa} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Final em Dinheiro (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="Contagem da gaveta..." 
                    className="h-16 text-xl font-black border-red-100 shadow-inner rounded-2xl"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="destructive" className="w-full h-16 font-black uppercase text-xs tracking-widest shadow-lg shadow-red-500/20 rounded-2xl" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Lock className="mr-2 h-5 w-5" />}
                  Encerrar Turno e Fechar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* LADO DIREITO: HISTÓRICO E INFO */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-background">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Histórico Recente
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/5 border-b">
                    <TableHead className="text-[9px] font-black uppercase px-6">Período</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase">Final</TableHead>
                    <TableHead className="text-center text-[9px] font-black uppercase px-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cashSessions || []).slice(0, 5).map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/5">
                      <TableCell className="px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px]">{s.opened_at ? format(parseISO(s.opened_at), 'dd/MM/yy HH:mm') : '--/--'}</span>
                          <span className="text-[9px] text-muted-foreground">{s.closed_at ? format(parseISO(s.closed_at), 'HH:mm') : '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-xs">
                        {s.closing_amount_cents ? formatCurrency(s.closing_amount_cents) : '—'}
                      </TableCell>
                      <TableCell className="text-center px-6">
                        <Badge variant={s.status === 'open' ? 'default' : 'secondary'} className="text-[8px] font-black uppercase h-5">
                          {s.status === 'open' ? 'Ativo' : 'Fechado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(cashSessions || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground font-medium text-xs italic">Nenhuma sessão registrada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="border-dashed border-2 bg-muted/5">
            <CardContent className="p-6 flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest">Importante</p>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                  O fechamento de caixa registra o valor físico contado. O sistema comparará automaticamente este valor com as vendas registradas para identificar possíveis furos.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
