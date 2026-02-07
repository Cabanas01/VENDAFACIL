'use client';

/**
 * @fileOverview Gestão de Produtos (Catálogo).
 * Blindagem contra erros de i18n e arrays indefinidos.
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Search, 
  PlusCircle, 
  MoreHorizontal, 
  AlertCircle, 
  Edit, 
  Trash2, 
  PackageCheck, 
  Loader2
} from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  category: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0).default(0),
  price_cents: z.coerce.number().int().min(0),
  cost_cents: z.coerce.number().int().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const formatCurrency = (value: number | undefined | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function ProductsPage() {
  const { products, store, refreshStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  const productsSafe = useMemo(() => Array.isArray(products) ? products : [], [products]);

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    return productsSafe.filter(p => (p.name || '').toLowerCase().includes(term));
  }, [productsSafe, search]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { stock_qty: 0, price_cents: 0, cost_cents: 0 }
  });

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    if (product) {
      form.reset({
        name: product.name,
        category: product.category || '',
        stock_qty: product.stock_qty,
        price_cents: product.price_cents,
        cost_cents: product.cost_cents,
      });
    } else {
      form.reset({ name: '', stock_qty: 0, price_cents: 0, cost_cents: 0, category: '' });
    }
    setIsModalOpen(true);
  };

  const onSave = async (values: ProductFormValues) => {
    try {
      setIsSubmitting(true);
      const payload = { ...values, store_id: store?.id };

      const { error } = editingProduct 
        ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
        : await supabase.from('products').insert([payload]);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Produto salvo no catálogo.' });
      setIsModalOpen(false);
      await refreshStatus();
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Catálogo" subtitle="Produtos e controle de estoque.">
        <Button onClick={() => handleOpenModal()} className="font-black uppercase text-xs">
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </PageHeader>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/5 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar catálogo..." 
              className="pl-10 h-11 bg-background" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead className="px-6 font-black uppercase text-[10px]">Descrição</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px]">Preço</TableHead>
              <TableHead className="text-center font-black uppercase text-[10px]">Estoque</TableHead>
              <TableHead className="text-right px-6 font-black uppercase text-[10px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map(p => (
              <TableRow key={p.id} className="hover:bg-primary/5">
                <TableCell className="px-6 py-4">
                  <span className="font-black text-sm uppercase">{p.name}</span>
                </TableCell>
                <TableCell className="text-right font-black text-primary">
                  {formatCurrency(p.price_cents)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={p.stock_qty <= 0 ? 'destructive' : 'outline'} className="font-black">
                    {p.stock_qty}
                  </Badge>
                </TableCell>
                <TableCell className="text-right px-6">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenModal(p)}><Edit className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-primary/5 py-10 px-8 text-center border-b">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
              {editingProduct ? 'Editar' : 'Novo'} Produto
            </DialogTitle>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 p-8">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Nome Comercial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="price_cents" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase">Preço (Centavos)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField name="stock_qty" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase">Estoque</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full h-14 font-black uppercase tracking-widest">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Produto'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
