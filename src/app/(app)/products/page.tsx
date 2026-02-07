
'use client';

/**
 * @fileOverview Gestão de Produtos (Catálogo) v6.0.
 * Sincronizado para não enviar colunas inexistentes (active/barcode) e garantir reatividade.
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Search, 
  PlusCircle, 
  Edit, 
  Loader2,
  Package
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!store?.id) return;
    
    try {
      setIsSubmitting(true);
      
      // REGRA DE OURO: Montar o payload explicitamente para evitar colunas inexistentes no banco
      const payload = {
        store_id: store.id,
        name: values.name,
        category: values.category || null,
        stock_qty: values.stock_qty,
        price_cents: values.price_cents,
        cost_cents: values.cost_cents || 0,
      };

      const { error } = editingProduct 
        ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
        : await supabase.from('products').insert([payload]);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Catálogo atualizado.' });
      setIsModalOpen(false);
      
      // 🔥 Sincronizar Estado
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
      <PageHeader title="Meus Produtos" subtitle="Controle seu estoque e catálogo de vendas.">
        <Button onClick={() => handleOpenModal()} className="font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total de Itens</p>
              <p className="text-2xl font-black">{productsSafe.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Package className="h-5 w-5" /></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-background">
        <div className="p-4 bg-muted/5 border-b flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar catálogo..." 
              className="pl-10 h-11 bg-background" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Produto</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Preço</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Estoque</TableHead>
                <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => (
                <TableRow key={p.id} className="hover:bg-primary/5 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{p.name}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">{p.category || 'Sem Categoria'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-primary text-base">
                    {formatCurrency(p.price_cents)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.stock_qty <= 0 ? 'destructive' : 'outline'} className="font-black h-6 min-w-[40px] justify-center">
                      {p.stock_qty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(p)} className="hover:bg-primary hover:text-white rounded-full transition-all">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-24 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">
                    Nenhum produto localizado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-primary/5 py-10 px-8 text-center border-b">
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">
              {editingProduct ? 'Editar' : 'Novo'} Produto
            </DialogTitle>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 p-8 bg-background">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome Comercial</FormLabel>
                  <FormControl><Input placeholder="Ex: Coca-Cola 350ml" className="h-12 font-bold" {...field} /></FormControl>
                  <FormMessage className="text-xs font-bold" />
                </FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField name="price_cents" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço (Em Centavos)</FormLabel>
                    <FormControl><Input type="number" placeholder="Ex: 500 para R$5,00" className="h-12 font-bold" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField name="stock_qty" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estoque Atual</FormLabel>
                    <FormControl><Input type="number" placeholder="0" className="h-12 font-bold" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full h-14 font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirmar Cadastro
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
