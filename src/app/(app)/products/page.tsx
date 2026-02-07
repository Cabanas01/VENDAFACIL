'use client';

import { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Package, 
  Trash2, 
  Coins,
  Loader2,
  ChevronRight
} from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

const reaisToCents = (value: string) => {
  const cleanValue = value.replace(/\D/g, '');
  return parseInt(cleanValue || '0', 10);
};

export default function ProductsPage() {
  const { products, store, refreshStatus } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isCostOpen, setIsCostOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price_cents: '0',
    cost_cents: '0',
    stock_quantity: '0',
    min_stock: '0',
    is_active: true
  });

  const [stockDelta, setStockDelta] = useState('0');

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    const list = Array.isArray(products) ? products : [];
    return list.filter(p => (p.name || '').toLowerCase().includes(term));
  }, [products, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('products').insert([{
        store_id: store.id,
        name: formData.name,
        category: formData.category || 'Geral',
        price_cents: reaisToCents(formData.price_cents),
        cost_cents: reaisToCents(formData.cost_cents),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        min_stock: parseInt(formData.min_stock, 10),
        is_active: formData.is_active
      }]);
      if (error) throw error;
      toast({ title: 'Produto criado!' });
      setIsCreateOpen(false);
      await refreshStatus();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('products').update({
        name: formData.name,
        category: formData.category,
        price_cents: reaisToCents(formData.price_cents),
        min_stock: parseInt(formData.min_stock, 10),
        is_active: formData.is_active
      }).eq('id', selectedProduct.id);
      if (error) throw error;
      toast({ title: 'Produto atualizado!' });
      setIsEditOpen(false);
      await refreshStatus();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao editar', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const newQty = (selectedProduct.stock_quantity || 0) + parseInt(stockDelta, 10);
      const { error } = await supabase.from('products').update({ stock_quantity: newQty }).eq('id', selectedProduct.id);
      if (error) throw error;
      toast({ title: 'Estoque ajustado!' });
      setIsStockOpen(false);
      setStockDelta('0');
      await refreshStatus();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no estoque', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('products').update({
        cost_cents: reaisToCents(formData.cost_cents)
      }).eq('id', selectedProduct.id);
      if (error) throw error;
      toast({ title: 'Custo atualizado!' });
      setIsCostOpen(false);
      await refreshStatus();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no custo', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (product: Product) => {
    if (!confirm(`Deseja realmente desativar o produto "${product.name}"? Ele deixará de aparecer no PDV.`)) return;
    try {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', product.id);
      if (error) throw error;
      toast({ title: 'Produto desativado.' });
      await refreshStatus();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao desativar', description: err.message });
    }
  };

  const openEdit = (p: Product) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      category: p.category || '',
      price_cents: p.price_cents.toString(),
      cost_cents: (p.cost_cents || 0).toString(),
      stock_quantity: p.stock_quantity.toString(),
      min_stock: (p.min_stock || 0).toString(),
      is_active: p.is_active
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Meus Produtos" subtitle="Gestão de catálogo, custos e estoque em tempo real.">
        <Button onClick={() => {
          setFormData({ name: '', category: '', price_cents: '0', cost_cents: '0', stock_quantity: '0', min_stock: '0', is_active: true });
          setIsCreateOpen(true);
        }} className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 h-11 px-6">
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border border-primary/5 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Pesquisar por nome ou categoria..." 
          className="border-none shadow-none focus-visible:ring-0 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Produto</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Categoria</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Preço</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Estoque</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Gestão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => {
                const isLowStock = (p.stock_quantity || 0) <= (p.min_stock || 0);
                return (
                  <TableRow key={p.id} className={cn("hover:bg-primary/5 transition-colors group", !p.is_active && "opacity-50 grayscale bg-muted/5")}>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-sm uppercase tracking-tight">{p.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-60">REF: {p.id.substring(0,8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-muted/20 border-none px-2">{p.category || 'GERAL'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary text-base">
                      {formatCurrency(p.price_cents)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={isLowStock ? 'destructive' : 'outline'} 
                        className={cn("font-black h-6 min-w-[40px] justify-center", isLowStock ? "animate-pulse" : "bg-green-50 text-green-600 border-green-100")}
                      >
                        {p.stock_quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-[8px] font-black uppercase tracking-tighter">
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary hover:text-white rounded-lg" title="Editar Dados" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-orange-500 hover:text-white rounded-lg" title="Ajustar Estoque" onClick={() => { setSelectedProduct(p); setIsStockOpen(true); }}>
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-600 hover:text-white rounded-lg" title="Ajustar Custo" onClick={() => { setSelectedProduct(p); setFormData({...formData, cost_cents: (p.cost_cents || 0).toString()}); setIsCostOpen(true); }}>
                          <Coins className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-600 hover:text-white rounded-lg" title="Desativar" onClick={() => handleSoftDelete(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24 text-muted-foreground font-black uppercase text-[10px] tracking-[0.2em] opacity-40">
                    Nenhum produto localizado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-primary/5 py-10 text-center border-b">
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Novo Produto</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Cadastro de catálogo</DialogDescription>
          </div>
          <form onSubmit={handleCreate} className="p-8 space-y-6 bg-background">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome Comercial *</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Preço de Venda (R$)</Label>
                  <Input type="number" required value={formData.price_cents} onChange={e => setFormData({...formData, price_cents: e.target.value})} className="h-12 font-black text-primary" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Custo CMV (R$)</Label>
                  <Input type="number" required value={formData.cost_cents} onChange={e => setFormData({...formData, cost_cents: e.target.value})} className="h-12 font-black text-orange-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estoque Inicial</Label>
                  <Input type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="h-12 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estoque Mínimo</Label>
                  <Input type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} className="h-12 font-bold border-red-100" />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar Cadastro'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-primary/5 py-10 text-center border-b">
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Editar Produto</DialogTitle>
          </div>
          <form onSubmit={handleUpdate} className="p-8 space-y-6 bg-background">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome Comercial</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Preço de Venda (R$)</Label>
                <Input type="number" value={formData.price_cents} onChange={e => setFormData({...formData, price_cents: e.target.value})} className="h-12 font-black text-primary" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Produto Ativo</Label>
                  <p className="text-[9px] text-muted-foreground font-bold">Disponível para venda no PDV</p>
                </div>
                <Switch checked={formData.is_active} onCheckedChange={val => setFormData({...formData, is_active: val})} />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase text-[11px] tracking-widest shadow-lg">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Salvar Alterações'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent className="sm:max-w-xs p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-orange-50 py-10 text-center border-b border-orange-100">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-orange-100 mb-4">
              <Package className="h-6 w-6 text-orange-500" />
            </div>
            <DialogTitle className="text-xl font-black font-headline uppercase tracking-tighter text-orange-950">Movimentar Estoque</DialogTitle>
            <p className="text-[10px] font-black uppercase text-orange-600 mt-1 opacity-60">{selectedProduct?.name}</p>
          </div>
          <form onSubmit={handleAdjustStock} className="p-8 space-y-6 bg-background">
            <div className="space-y-2 text-center">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Quantidade Delta (+ ou -)</Label>
              <Input 
                type="number" 
                value={stockDelta} 
                onChange={e => setStockDelta(e.target.value)} 
                className="h-16 text-center text-3xl font-black border-none bg-muted/30 focus-visible:ring-orange-500/20" 
                autoFocus 
              />
              <p className="text-[10px] font-bold text-muted-foreground mt-2 italic">
                Saldo atual: <span className="text-foreground">{selectedProduct?.stock_quantity}</span>
              </p>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase text-[11px] tracking-widest bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar Movimentação'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCostOpen} onOpenChange={setIsCostOpen}>
        <DialogContent className="sm:max-w-xs p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-green-50 py-10 text-center border-b border-green-100">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-green-100 mb-4">
              <Coins className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-black font-headline uppercase tracking-tighter text-green-950">Atualizar Custo (CMV)</DialogTitle>
          </div>
          <form onSubmit={handleUpdateCost} className="p-8 space-y-6 bg-background">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Novo Custo de Compra (R$)</Label>
              <Input 
                type="number" 
                value={formData.cost_cents} 
                onChange={e => setFormData({...formData, cost_cents: e.target.value})} 
                className="h-14 font-black text-2xl text-center text-green-700" 
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase text-[11px] tracking-widest bg-green-600 hover:bg-green-700 shadow-xl shadow-green-600/20">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Atualizar Custo'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
