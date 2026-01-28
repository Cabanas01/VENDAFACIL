'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, PlusCircle, MoreHorizontal, Edit, Trash2, Upload, Download } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { isValidCpf } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const customerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().optional().refine(val => !val || isValidCpf(val), 'CPF inválido'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

const PAGE_SIZE = 20;

export default function ClientsPage() {
  const { store, addCustomer } = useAuth();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 500);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  const fetchCustomers = useCallback(async () => {
    if (!store) return;
    setLoading(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (debouncedSearch) {
      query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,cpf.ilike.%${debouncedSearch}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      setError(error.message);
      toast({ variant: 'destructive', title: 'Erro ao buscar clientes', description: error.message });
    } else {
      setCustomers(data || []);
      setCount(count || 0);
    }
    setLoading(false);
  }, [store, page, debouncedSearch, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenModal = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    if (customer) {
      form.reset(customer);
    } else {
      form.reset({ name: '', email: '', phone: '', cpf: '' });
    }
    setIsModalOpen(true);
  };
  
  const onSubmit = async (values: CustomerFormValues) => {
    if (!store) return;
    try {
      if (editingCustomer) {
        await supabase.from('customers').update(values).eq('id', editingCustomer.id);
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        await addCustomer(values);
        toast({ title: "Cliente criado com sucesso!" });
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: error.message.includes('limite') ? 'Limite do Plano Atingido' : "Erro ao salvar cliente", description: error.message });
    }
  };
  
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await supabase.from('customers').delete().eq('id', customerToDelete.id);
      toast({ title: "Cliente excluído com sucesso!" });
      fetchCustomers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro ao excluir cliente", description: error.message });
    } finally {
      setIsDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    }
  };

  const openDeleteConfirmation = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteConfirmOpen(true);
  };

  const handleDownloadTemplate = () => {
    const csv = 'name,email,phone,cpf';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'modelo_importacao_clientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !store) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const requiredHeaders = ['name', 'email', 'phone'];
            const actualHeaders = results.meta.fields || [];
            if (!requiredHeaders.every(h => actualHeaders.includes(h))) {
                toast({ variant: 'destructive', title: 'Cabeçalho inválido', description: "Use o modelo padrão de planilha." });
                return;
            }

            const validRows = (results.data as any[])
                .map(row => ({
                    ...row,
                    store_id: store.id
                }))
                .filter(row => {
                    try {
                        customerSchema.parse(row);
                        return true;
                    } catch {
                        return false;
                    }
                });
            
            if (validRows.length > 0) {
                const { error } = await supabase.from('customers').insert(validRows);
                if (error) {
                     toast({ variant: 'destructive', title: 'Erro na importação', description: error.message });
                } else {
                     toast({ title: 'Importação concluída!', description: `${validRows.length} clientes importados.` });
                     fetchCustomers();
                }
            } else {
                 toast({ variant: 'destructive', title: 'Nenhuma linha válida encontrada.' });
            }
            setIsImportModalOpen(false);
        }
    });
  };

  return (
    <>
      <PageHeader title="Clientes" subtitle="Gerencie sua base de clientes.">
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}><Upload className="mr-2 h-4 w-4" /> Importar</Button>
            <Button onClick={() => handleOpenModal()}><PlusCircle className="mr-2 h-4 w-4" /> Novo Cliente</Button>
        </div>
      </PageHeader>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, email, telefone ou CPF..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : customers.length > 0 ? (
                  customers.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell>{c.cpf || '-'}</TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenModal(c)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => openDeleteConfirmation(c)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhum cliente encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
             <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Página {page + 1} de {Math.ceil(count / PAGE_SIZE)}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Anterior</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= count}>Próximo</Button>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="email" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="phone" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="cpf" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>CPF (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Importar Clientes</DialogTitle>
                <DialogDescription>
                    Faça o upload de uma planilha CSV ou XLSX com as colunas: name, email, phone, cpf.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Button variant="secondary" className="w-full" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" /> Baixar modelo de planilha
                </Button>
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Clique para fazer upload</span></p>
                        </div>
                        <Input id="file-upload" type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleImport} />
                    </label>
                </div> 
            </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente "{customerToDelete?.name}" será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
