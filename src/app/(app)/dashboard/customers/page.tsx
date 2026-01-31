'use client';

/**
 * @fileOverview Gestão de Clientes do Dashboard
 * 
 * Lista e gerencia os clientes da loja com métricas de compra.
 */

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, User, Mail, Phone, MoreHorizontal, Edit, Trash2, Loader2, Users, ShoppingBag } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase/client';
import type { Customer } from '@/lib/types';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

export default function CustomersDashboardPage() {
  const { store, addCustomer, sales } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const loadCustomers = async () => {
    if (!store) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', store.id)
      .order('name');
    
    if (!error) setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, [store]);

  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.email.toLowerCase().includes(term) ||
      c.phone.includes(term)
    );
  }, [customers, search]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      cpf: formData.get('cpf') as string || null,
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
      loadCustomers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir cliente permanentemente?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Cliente removido.' });
      loadCustomers();
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Meus Clientes" subtitle="Fidelize seu público e gerencie contatos.">
        <Button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Base de Clientes
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou contato..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs uppercase font-bold">Cliente</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Contato</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Histórico</TableHead>
                    <TableHead className="text-right text-xs uppercase font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(c => {
                    const customerSales = sales.filter(s => s.items?.some(i => i.product_id === c.id)); // Exemplo simplificado
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-bold">{c.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-muted-foreground">
                            <span>{c.email}</span>
                            <span>{c.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <ShoppingBag className="h-3 w-3" /> {new Date(c.created_at).toLocaleDateString()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCustomer ? 'Editar' : 'Cadastrar'} Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <Input name="name" defaultValue={editingCustomer?.name} placeholder="Nome completo" required />
            <div className="grid grid-cols-2 gap-4">
              <Input name="phone" defaultValue={editingCustomer?.phone} placeholder="Telefone" required />
              <Input name="cpf" defaultValue={editingCustomer?.cpf || ''} placeholder="CPF (Opcional)" />
            </div>
            <Input name="email" type="email" defaultValue={editingCustomer?.email} placeholder="E-mail" required />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
