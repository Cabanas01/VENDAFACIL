'use client';

/**
 * @fileOverview Gestão de Produtos (CRUD Direto via Supabase)
 * 
 * Removido campo 'active' para compatibilidade com schema real do banco.
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
  ChefHat, 
  GlassWater, 
  PackageCheck, 
  Clock,
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
import { Switch } from '@/components/ui/switch';
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
  barcode: z.string().optional(),
  category: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0, 'Estoque não pode ser negativo').default(0),
  min_stock_qty: z.coerce.number().int().optional(),
  price_cents: z.coerce.number().int().min(0, 'Preço deve ser positivo'),
  cost_cents: z.coerce.number().int().optional(),
  production_target: z.enum(['cozinha', 'bar', 'nenhum'], {
    required_error: 'Selecione o destino de preparo',
  }),
  prep_time_minutes: z.coerce.number().int().min(1, 'Mínimo 1 minuto'),
});

type ProductFormValues = z.infer<typeof productSchema>;

const formatCurrency = (value: number | undefined | null) =>
  value == null ? 'N/A' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const parseCurrency = (value: string) => {
    if (!value) return 0;
    const onlyDigits = value.replace(/\D/g, '');
    if (onlyDigits === '') return 0;
    return parseInt(onlyDigits, 10);
};

export default function ProductsPage() {
  const { products, store, refreshStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const productsSafe = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  const categories = useMemo(() => ['all', ...Array.from(new Set(productsSafe.map(p => p.category).filter(Boolean)))], [productsSafe]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      production_target: 'nenhum',
      prep_time_minutes: 5,
      stock_qty: 0,
      price_cents: 0,
      cost_cents: 0
    }
  });

  const { watch, setValue } = form;
  const cost = watch('cost_cents');
  const price = watch('price_cents');
  
  const profitMargin = useMemo(() => {
      if(cost != null && price != null && cost > 0) {
          return ((price - cost) / cost) * 100;
      }
      return 0;
  }, [cost, price]);

  const filteredProducts = useMemo(() => {
    return productsSafe
      .filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.category || '').toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(p => categoryFilter === 'all' || p.category === categoryFilter);
  }, [productsSafe, searchQuery, categoryFilter]);

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    if (product) {
      form.reset({
        name: product.name,
        barcode: product.barcode || '',
        category: product.category || '',
        stock_qty: product.stock_qty,
        min_stock_qty: product.min_stock_qty,
        price_cents: product.price_cents,
        cost_cents: product.cost_cents,
        production_target: (product.production_target as any) || 'nenhum',
        prep_time_minutes: product.prep_time_minutes || 5,
      });
    } else {
      form.reset({ stock_qty: 0, price_cents: 0, cost_cents: 0, category: '', min_stock_qty: 0, barcode: '', production_target: 'nenhum', prep_time_minutes: 5 });
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (values: ProductFormValues) => {
    if (!store?.id) {
      toast({ variant: 'destructive', title: 'Unidade não identificada' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(values)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: "Produto atualizado!" });
      } else {
        const { error } = await supabase
          .from('products')
          .insert({ ...values, store_id: store.id });
        if (error) throw error;
        toast({ title: "Produto cadastrado com sucesso!" });
      }
      
      setIsModalOpen(false);
      await refreshStatus();
      router.refresh();
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erro ao salvar produto", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
        const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
        if (error) throw error;
        toast({ title: "Produto excluído com sucesso." });
        await refreshStatus();
        router.refresh();
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erro ao excluir produto", description: error.message });
    } finally {
        setIsDeleteConfirmOpen(false);
        setProductToDelete(null);
    }
  };

  const kpiData = useMemo(() => ({
      noStock: productsSafe.filter(p => p.stock_qty === 0).length,
      lowStock: productsSafe.filter(p => p.min_stock_qty && p.stock_qty > 0 && p.stock_qty <= p.min_stock_qty).length,
      total: productsSafe.length,
  }), [productsSafe]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Catálogo de Produtos" subtitle="Gestão centralizada de inventário.">
        <Button onClick={() => handleOpenModal()} className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sem Estoque</p>
              <p className="text-3xl font-black tracking-tighter">{kpiData.noStock}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-destructive opacity-40" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estoque Crítico</p>
              <p className="text-3xl font-black tracking-tighter">{kpiData.lowStock}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500 opacity-40" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Itens</p>
              <p className="text-3xl font-black tracking-tighter">{kpiData.total}</p>
            </div>
            <PackageCheck className="h-8 w-8 text-muted-foreground opacity-40" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 bg-muted/10 border-b flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." className="pl-10 h-11 bg-background" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-11 font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={String(c)} value={String(c)} className="font-bold">{c === 'all' ? 'Todas Categorias' : String(c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="px-6 font-black uppercase text-[10px]">Produto</TableHead>
                  <TableHead className="font-black uppercase text-[10px]">Destino</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px]">Venda</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px]">Estoque</TableHead>
                  <TableHead className="text-right px-6 font-black uppercase text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(p => (
                  <TableRow key={p.id} className="hover:bg-primary/5 transition-colors group">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-sm uppercase tracking-tight">{p.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-60">{p.barcode || p.id.substring(0,8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.production_target === 'cozinha' && <Badge variant="outline" className="gap-1 text-orange-600 border-orange-200 bg-orange-50 font-black text-[9px] uppercase"><ChefHat className="h-3 w-3" /> Cozinha</Badge>}
                      {p.production_target === 'bar' && <Badge variant="outline" className="gap-1 text-cyan-600 border-cyan-200 bg-cyan-50 font-black text-[9px] uppercase"><GlassWater className="h-3 w-3" /> Bar</Badge>}
                      {(!p.production_target || p.production_target === 'nenhum') && <Badge variant="outline" className="gap-1 text-muted-foreground border-muted-foreground/20 font-black text-[9px] uppercase">Balcão</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-black text-primary text-sm">{formatCurrency(p.price_cents)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.stock_qty === 0 ? 'destructive' : (p.min_stock_qty && p.stock_qty <= p.min_stock_qty) ? 'default' : 'outline'} className={p.min_stock_qty && p.stock_qty <= p.min_stock_qty ? 'bg-yellow-500 text-white border-none' : 'font-black'}>
                        {p.stock_qty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="group-hover:bg-primary group-hover:text-white transition-colors"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-2">
                          <DropdownMenuItem onClick={() => handleOpenModal(p)} className="gap-3 font-bold text-xs cursor-pointer py-2.5">
                            <Edit className="h-4 w-4" /> Editar Produto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setProductToDelete(p); setIsDeleteConfirmOpen(true); }} className="gap-3 font-black text-xs text-destructive hover:bg-destructive/10 cursor-pointer py-2.5">
                            <Trash2 className="h-4 w-4" /> Excluir Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">
                      Nenhum produto localizado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-primary/5 pt-10 pb-6 px-8 text-center border-b border-primary/10">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-primary/10 mb-4">
              <PackageCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter text-center">{editingProduct ? 'Atualizar' : 'Cadastrar'} Produto</DialogTitle>
              <DialogDescription className="text-center font-medium text-sm">Defina os parâmetros do item no catálogo.</DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveProduct)} className="space-y-6 p-8 bg-background">
              <div className="grid grid-cols-2 gap-6">
                <FormField name="name" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Nome Comercial *</FormLabel><FormControl><Input placeholder="Ex: Produto X" className="h-12 font-bold" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="category" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Categoria</FormLabel><FormControl><Input placeholder="Ex: Geral" className="h-12 font-bold" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <FormField name="production_target" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Destino de Produção *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 border-primary/20 font-bold focus:ring-primary/20"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="nenhum" className="font-bold">Pronta Entrega (Balcão)</SelectItem>
                        <SelectItem value="cozinha" className="text-orange-600 font-bold">Cozinha (KDS)</SelectItem>
                        <SelectItem value="bar" className="text-cyan-600 font-bold">Bar (BDS)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="prep_time_minutes" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Clock className="h-3 w-3" /> Tempo de Preparo (min)</FormLabel>
                    <FormControl><Input type="number" className="h-12 font-black text-lg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

               <Card className="p-6 bg-muted/30 border-primary/5 rounded-2xl">
                <div className="grid grid-cols-2 gap-6">
                    <FormField name="cost_cents" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Custo de Compra (R$)</FormLabel>
                        <FormControl><Input placeholder="0,00" value={field.value != null ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value / 100) : ''} onChange={e => field.onChange(parseCurrency(e.target.value))} className="h-12 font-bold bg-background" /></FormControl>
                    </FormItem>
                    )} />
                     <FormField name="price_cents" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Preço de Venda (R$)</FormLabel>
                        <FormControl><Input placeholder="0,00" value={field.value != null ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value / 100) : ''} onChange={e => field.onChange(parseCurrency(e.target.value))} className="h-12 font-black text-primary text-xl bg-background border-primary/20" /></FormControl>
                    </FormItem>
                    )} />
                </div>
                <div className="mt-4 flex justify-between items-center px-2">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Margem Estimada</span>
                  <span className={`text-sm font-black ${profitMargin > 30 ? 'text-green-600' : 'text-orange-600'}`}>{profitMargin.toFixed(1)}%</span>
                </div>
               </Card>

              <div className="grid grid-cols-2 gap-6">
                <FormField name="stock_qty" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Estoque Atual</FormLabel><FormControl><Input type="number" className="h-12 font-bold" {...field} /></FormControl></FormItem>
                )} />
                <FormField name="barcode" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Cód. de Barras</FormLabel><FormControl><Input className="h-12 font-bold" {...field} /></FormControl></FormItem>
                )} />
              </div>

              <DialogFooter className="pt-4 gap-3 sm:flex-row-reverse">
                <Button type="submit" disabled={isSubmitting} className="flex-1 h-14 font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-primary/20">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Produto
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 font-black uppercase text-[11px] tracking-[0.2em]" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[32px] border-none p-10">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Excluir Produto?</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium text-slate-600">
              Esta ação removerá permanentemente o produto do catálogo. Não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:flex-row-reverse">
            <AlertDialogAction onClick={handleDeleteProduct} className="flex-1 h-14 bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[11px] tracking-widest shadow-lg">
              Sim, Excluir
            </AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 font-black uppercase text-[11px] tracking-widest">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
