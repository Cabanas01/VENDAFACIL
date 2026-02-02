'use client';

import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, PlusCircle, ChevronsLeft, ChevronsRight, MoreHorizontal, AlertCircle, Edit, Trash2, Barcode, ChefHat, GlassWater } from 'lucide-react';

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

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  barcode: z.string().optional(),
  category: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0, 'Estoque não pode ser negativo').default(0),
  min_stock_qty: z.coerce.number().int().optional(),
  active: z.boolean().default(true),
  price_cents: z.coerce.number().int().min(0, 'Preço deve ser positivo'),
  cost_cents: z.coerce.number().int().optional(),
  destino_preparo: z.enum(['cozinha', 'bar', 'nenhum']).default('nenhum'),
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
  const { products, addProduct, updateProduct, removeProduct, updateProductStock, findProductByBarcode } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const { toast } = useToast();
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
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
    return products
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category?.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
      .filter(p => statusFilter === 'all' || (statusFilter === 'active' && p.active) || (statusFilter === 'inactive' && !p.active))
      .filter(p => {
          if (stockFilter === 'all') return true;
          if (stockFilter === 'empty') return p.stock_qty === 0;
          if (stockFilter === 'low' && p.min_stock_qty) return p.stock_qty > 0 && p.stock_qty <= p.min_stock_qty;
          return false;
      });
  }, [products, searchQuery, categoryFilter, statusFilter, stockFilter]);

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    if (product) {
      form.reset({
        name: product.name,
        barcode: product.barcode || '',
        category: product.category || '',
        stock_qty: product.stock_qty,
        min_stock_qty: product.min_stock_qty,
        active: product.active,
        price_cents: product.price_cents,
        cost_cents: product.cost_cents,
        destino_preparo: product.destino_preparo || 'nenhum',
      });
    } else {
      form.reset({ active: true, stock_qty: 0, price_cents: 0, cost_cents: 0, category: '', min_stock_qty: 0, barcode: '', destino_preparo: 'nenhum' });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (values.barcode) {
        const existingProduct = await findProductByBarcode(values.barcode);
        if (existingProduct && existingProduct.id !== editingProduct?.id) {
          toast({
            variant: 'destructive',
            title: 'Código de barras já existe',
            description: `O código "${values.barcode}" já está associado ao produto "${existingProduct.name}".`,
          });
          return;
        }
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, values);
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        await addProduct(values);
        toast({ title: "Produto criado com sucesso!" });
      }
      setIsModalOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erro ao salvar produto", description: error.message });
    }
  };
  
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
        await removeProduct(productToDelete.id);
        toast({ title: "Produto excluído com sucesso!" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erro ao excluir produto", description: error.message });
    } finally {
        setIsDeleteConfirmOpen(false);
        setProductToDelete(null);
    }
  };

  const openDeleteConfirmation = (product: Product) => {
      setProductToDelete(product);
      setIsDeleteConfirmOpen(true);
  }

  const adjustStock = async (productId: string, currentStock: number, amount: number) => {
      const newStock = currentStock + amount;
      if (newStock < 0) {
          toast({ variant: 'destructive', title: 'Ajuste inválido', description: 'Estoque não pode ser negativo.' });
          return;
      }
      try {
          await updateProductStock(productId, newStock);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Erro ao ajustar estoque', description: error.message });
      }
  }

  const kpiData = useMemo(() => ({
      noStock: products.filter(p => p.stock_qty === 0).length,
      lowStock: products.filter(p => p.min_stock_qty && p.stock_qty > 0 && p.stock_qty <= p.min_stock_qty).length,
      inactive: products.filter(p => !p.active).length,
  }), [products]);

  return (
    <>
      <PageHeader title="Produtos" subtitle="Gerencie seu catálogo e estoque.">
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
             <Card>
                <CardContent className="pt-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Produtos sem estoque</p>
                        <p className="text-2xl font-bold">{kpiData.noStock}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-destructive" />
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Estoque crítico</p>
                        <p className="text-2xl font-bold">{kpiData.lowStock}</p>
                    </div>
                     <AlertCircle className="h-8 w-8 text-yellow-500" />
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Produtos inativos</p>
                        <p className="text-2xl font-bold">{kpiData.inactive}</p>
                    </div>
                     <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </CardContent>
            </Card>
        </div>

        <Card>
          <CardContent className="pt-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou categoria..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'Todas as Categorias' : c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Estoque</SelectItem>
                <SelectItem value="empty">Sem estoque</SelectItem>
                <SelectItem value="low">Estoque baixo</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preparação</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>% Lucro</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações de Estoque</TableHead>
                  <TableHead className="text-right">Opções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.destino_preparo === 'cozinha' && <Badge variant="outline" className="gap-1 text-orange-600 border-orange-200"><ChefHat className="h-3 w-3" /> Cozinha</Badge>}
                      {p.destino_preparo === 'bar' && <Badge variant="outline" className="gap-1 text-cyan-600 border-cyan-200"><GlassWater className="h-3 w-3" /> Bar</Badge>}
                      {(!p.destino_preparo || p.destino_preparo === 'nenhum') && <span className="text-muted-foreground text-xs">Balcão</span>}
                    </TableCell>
                    <TableCell>{formatCurrency(p.price_cents)}</TableCell>
                    <TableCell>{formatCurrency(p.cost_cents)}</TableCell>
                    <TableCell>{p.cost_cents && p.price_cents > p.cost_cents ? `${(((p.price_cents - p.cost_cents) / p.cost_cents) * 100).toFixed(0)}%` : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={p.stock_qty === 0 ? 'destructive' : p.min_stock_qty && p.stock_qty <= p.min_stock_qty ? 'default' : 'outline'} className={p.min_stock_qty && p.stock_qty <= p.min_stock_qty ? 'bg-yellow-500 text-white' : ''}>{p.stock_qty}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.active ? 'default' : 'secondary'} className={p.active ? 'bg-green-500' : ''}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustStock(p.id, p.stock_qty, -1)}><ChevronsLeft className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustStock(p.id, p.stock_qty, 1)}><ChevronsRight className="h-4 w-4" /></Button>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(p)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={() => openDeleteConfirmation(p)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Product Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>Preencha as informações do produto.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField name="name" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="category" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Categoria (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField name="barcode" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input {...field} ref={barcodeInputRef} placeholder="Digitar ou ler" />
                      </FormControl>
                      <Button type="button" variant="outline" onClick={() => barcodeInputRef.current?.focus()}>
                        <Barcode className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="destino_preparo" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destino de Preparo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nenhum">Pronta Entrega (Balcão)</SelectItem>
                        <SelectItem value="cozinha">Cozinha (Alimentos)</SelectItem>
                        <SelectItem value="bar">Bar (Bebidas)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField name="stock_qty" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Estoque Inicial</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="min_stock_qty" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Estoque Mínimo (opcional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

               <Card className="p-4 bg-muted/50">
                <div className="grid grid-cols-3 gap-4">
                    <FormField name="cost_cents" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Custo (R$)</FormLabel>
                        <FormControl><Input placeholder="R$ 0,00" value={field.value != null ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value / 100) : ''} onChange={e => field.onChange(parseCurrency(e.target.value))} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )} />
                     <FormItem>
                        <FormLabel>% Lucro Desejada</FormLabel>
                        <Input type="number" placeholder="30" value={profitMargin > 0 ? profitMargin.toFixed(0) : ''} onChange={e => {
                            const percent = Number(e.target.value);
                            if (cost != null) {
                                setValue('price_cents', Math.round(cost * (1 + percent / 100)));
                            }
                        }}/>
                    </FormItem>
                     <FormField name="price_cents" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Preço de Venda (R$)</FormLabel>
                        <FormControl><Input placeholder="R$ 0,00" value={field.value != null ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value / 100) : ''} onChange={e => field.onChange(parseCurrency(e.target.value))} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )} />
                </div>
                <div className="text-sm text-muted-foreground mt-2 font-bold">
                    Lucro bruto por unidade: {formatCurrency(price != null && cost != null ? price - cost : 0)}
                </div>
               </Card>
              
              <FormField name="active" control={form.control} render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                  <div className="space-y-0.5"><FormLabel className="text-xs font-bold uppercase tracking-widest">Produto Ativo para Venda</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Produto</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto "{productToDelete?.name}" será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
