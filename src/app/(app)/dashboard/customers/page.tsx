'use client';

/**
 * @fileOverview Gestão de Clientes do Dashboard com Histórico de Compras.
 * Corrigido botão Salvar Cadastro utilizando o AuthProvider.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Loader2, 
  Users, 
  ShoppingBag, 
  History, 
  CalendarDays,
  CreditCard,
  ChevronRight,
  X
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import type { Customer, Sale } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function CustomersDashboardPage() {
  const { store, addCustomer, sales, refreshStatus } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);

  const loadCustomers = useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', store.id)
        .order('name');
      
      if (!error) setCustomers(data || []);
    } catch (err) {
      console.error('Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const loadCustomerHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryLoading(true);
    setIsHistoryOpen(true);
    
    const filteredSales = (sales || []).filter(s => s.customer_id === customer.id);
    setCustomerSales(filteredSales);
    setHistoryLoading(false);
  };

  const filteredCustomers = useMemo(() => {
    const term = (search || '').toLowerCase();
    const safeCustomers = Array.isArray(customers) ? customers : [];
    return safeCustomers.filter(c => 
      (c.name || '').toLowerCase().includes(term) || 
      (c.email || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term)
    );
  }, [customers, search]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || !store?.id) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || '',
      cpf: (formData.get('cpf') as string) || null,
    };

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        const { error } = await supabase.from('customers').update(data).eq('id', editingCustomer.id);
        if (error) throw error;
        toast({ title: 'Cliente atualizado!' });
      } else {
        await addCustomer(data);
        toast({ title: 'Cliente cadastrado!' });
      }
      setIsModalOpen(false);
      await loadCustomers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cliente?')) return;
    
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Cliente removido com sucesso.' });
      loadCustomers();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha na Operação', description: err.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Meus Clientes" subtitle="Gestão de base e inteligência de consumo.">
        <Button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
      </PageHeader>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-headline font-black uppercase tracking-tighter">
                <Users className="h-5 w-5 text-primary" /> Lista de Relacionamento
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase opacity-60">Total: {customers.length} cadastros</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="pl-10 h-11 bg-background" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/20" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Consultando CRM...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-black px-6">Cliente</TableHead>
                    <TableHead className="text-[10px] uppercase font-black px-6">Contato</TableHead>
                    <TableHead className="text-[10px] uppercase font-black px-6">Data Cadastro</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-black px-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(c => (
                    <TableRow key={c.id} className="hover:bg-primary/5 transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                            {c.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-sm uppercase tracking-tighter">{c.name || 'Sem Nome'}</p>
                            <p className="text-[9px] font-mono text-muted-foreground uppercase opacity-60">{c.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex flex-col text-xs font-bold">
                          <span className="lowercase text-muted-foreground">{c.email || '—'}</span>
                          <span className="text-primary">{c.phone || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5 opacity-40" />
                          {c.created_at ? format(parseISO(c.created_at), 'dd/MM/yyyy') : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="group-hover:bg-primary group-hover:text-white transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-2">
                            <DropdownMenuItem onClick={() => loadCustomerHistory(c)} className="py-2.5 font-bold text-xs gap-3 cursor-pointer">
                              <History className="h-4 w-4 text-primary" /> Histórico de Compras
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }} className="py-2.5 font-bold text-xs gap-3 cursor-pointer">
                              <Edit className="h-4 w-4" /> Editar Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(c.id)} className="py-2.5 font-black text-xs text-destructive gap-3 hover:bg-destructive/10 cursor-pointer">
                              <Trash2 className="h-4 w-4" /> Excluir Cliente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-primary/5 pt-10 pb-6 px-8 text-center border-b border-primary/10">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-primary/10 mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter text-center">{editingCustomer ? 'Atualizar' : 'Cadastrar'} Cliente</DialogTitle>
              <DialogDescription className="text-center font-medium text-sm">Preencha os dados básicos para o relacionamento.</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSave} className="space-y-6 p-8 bg-background">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome Completo *</label>
              <Input name="name" defaultValue={editingCustomer?.name || ''} placeholder="Ex: João da Silva" className="h-12 font-bold" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">WhatsApp / Celular *</label>
                <Input name="phone" defaultValue={editingCustomer?.phone || ''} placeholder="(00) 00000-0000" className="h-12 font-bold" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CPF (Opcional)</label>
                <Input name="cpf" defaultValue={editingCustomer?.cpf || ''} placeholder="000.000.000-00" className="h-12 font-bold" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail de Contato</label>
              <Input name="email" type="email" defaultValue={editingCustomer?.email || ''} placeholder="email@exemplo.com" className="h-12 font-bold" />
            </div>

            <DialogFooter className="pt-4 gap-3 sm:flex-row-reverse">
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                Salvar Cadastro
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 font-black uppercase text-[11px] tracking-widest">
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
