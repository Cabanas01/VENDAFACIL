'use client';

/**
 * @fileOverview Gestão de Clientes do Dashboard
 * 
 * Lista e gerencia os clientes da loja com métricas de compra.
 * Implementação defensiva para evitar exceções client-side.
 */

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Users, ShoppingBag } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase/client';
import type { Customer } from '@/lib/types';

export default function CustomersDashboardPage() {
  const { store, addCustomer } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const loadCustomers = async () => {
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
  };

  useEffect(() => {
    loadCustomers();
  }, [store?.id]);

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
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
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
      loadCustomers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir cliente permanentemente?')) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Cliente removido.' });
      loadCustomers();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
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
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs uppercase font-bold">Cliente</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Contato</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Cadastro</TableHead>
                    <TableHead className="text-right text-xs uppercase font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold">{c.name || 'Sem Nome'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span>{c.email || 'N/A'}</span>
                          <span>{c.phone || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <ShoppingBag className="h-3 w-3" /> 
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }}>
                              <Edit className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive font-bold">
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Nenhum cliente localizado.
                      </TableCell>
                    </TableRow>
                  )}
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
            <div className="space-y-2">
              <label className="text-sm font-bold">Nome Completo</label>
              <Input name="name" defaultValue={editingCustomer?.name || ''} placeholder="Ex: João da Silva" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Telefone</label>
                <Input name="phone" defaultValue={editingCustomer?.phone || ''} placeholder="(00) 00000-0000" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">CPF (Opcional)</label>
                <Input name="cpf" defaultValue={editingCustomer?.cpf || ''} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">E-mail</label>
              <Input name="email" type="email" defaultValue={editingCustomer?.email || ''} placeholder="email@exemplo.com" required />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Cliente</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}