'use client';

/**
 * @fileOverview Gestão Profissional de Produtos v7.1
 * Corrigido handler de criação e tipos financeiros.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Edit, 
  Package, 
  Trash2, 
  Coins,
  Loader2,
  ChevronRight,
  AlertTriangle
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

const reaisToCents = (value: any) => {
  if (typeof value !== 'string') return 0;
  if (!value) return 0;
  const sanitized = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
};

export default function ProductsPage() {
  const { products, store, refreshStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isCostOpen, setIsCostOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState('0');
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price_cents: '',
    cost_cents: '',
    stock_quantity: '0',
    min_stock: '0',
    is_active: true
  });

  const safeProducts = useMemo(() => Array.isArray(products) ? products : [], [products]);

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    return safeProducts.filter(p => 
      (p.name || '').toLowerCase().includes(term) || 
      (p.category || '').toLowerCase().includes(term)
    );
  }, [safeProducts, search]);

  const stats = useMemo(() => {
    const lowStock = safeProducts.filter(p => (p.stock_quantity || 0) <= (p.min_stock || 0)).length;
    const activeCount = safeProducts.filter(p => p.is_active).length;
    return { lowStock, activeCount };
  }, [safeProducts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('products').insert([{
        store_id: store.id,
        name: formData.name,
        category: formData.category || 'Geral',
        price_cents: reaisToCents(formData.price_cents),
        cost_cents: reaisToCents(formData.cost_cents),
        stock_quantity: parseInt(formData.stock_quantity || '0', 10),
        min_stock: parseInt(formData.min_stock || '0', 10),
        is_active: formData.is_active
      }]);
      
      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Produto cadastrado no catálogo.' });
      setIsCreateOpen(false);
      await refreshStatus();
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha no cadastro', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('products').update({
        name: formData.name,
        category: formData.category,
        price_cents: reaisToCents(formData.price_cents),
        min_stock: parseInt(formData.min_stock || '0', 10),
        is_active: formData.is_active
      }).eq('id', selectedProduct.id);

      if (error) throw error;

      toast({ title: 'Produto Atualizado' });
      setIsEditOpen(false);
      await refreshStatus();
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro na atualização', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || loading) return;
    setLoading(true);
    try {
      const newQty = (selectedProduct.stock_quantity || 0) + parseInt(stockDelta || '0', 10);
      const { error } = await supabase.from('products').update({ stock_quantity: newQty }).eq('id', selectedProduct.id);
      
      if (error) throw error;

      toast({ title: 'Estoque Ajustado', description: `Novo saldo: ${newQty} un.` });
      setIsStockOpen(false);
      setStockDelta('0');
      await refreshStatus();
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no estoque', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('products').update({
        cost_cents: reaisToCents(formData.cost_cents)
      }).eq('id', selectedProduct.id);

      if (error) throw error;

      toast({ title: 'CMV Atualizado', description: 'Novo custo de mercadoria registrado.' });
      setIsCostOpen(false);
      await refreshStatus();
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no custo', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (p: Product) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      category: p.category || '',
      price_cents: (p.price_cents / 100).toString(),
      cost_cents: ((p.cost_cents || 0) / 100).toString(),
      stock_quantity: p.stock_quantity.toString(),
      min_stock: (p.min_stock || 0).toString(),
      is_active: p.is_active
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Gestão de Catálogo" subtitle="Controle de preços, custos e inventário.">
        <Button onClick={() => {
          setFormData({ name: '', category: '', price_cents: '', cost_cents: '', stock_quantity: '0', min_stock: '0', is_active: true });
          setIsCreateOpen(true);
        }} className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 h-11 px-6">
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-background">
          <CardHeader className="pb-2">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estoque Crítico</p>
          </CardHeader>
          <CardContent>
            <div className={cn("text-4xl font-black tracking-tighter", stats.lowStock > 0 ? "text-red-500" : "text-foreground")}>
              {stats.lowStock}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-background">
          <CardHeader className="pb-2">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Produtos Ativos</p>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{stats.activeCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/10">
          <CardHeader className="pb-2">
            <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Total no Catálogo</p>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{safeProducts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border border-primary/5 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Filtrar por nome ou categoria..." 
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
                <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Descrição</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Venda (R$)</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Margem</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Estoque</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Mínimo</TableHead>
                <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => {
                const isLow = (p.stock_quantity || 0) <= (p.min_stock || 0);
                const margin = p.price_cents - (p.cost_cents || 0);
                return (
                  <TableRow key={p.id} className={cn("hover:bg-primary/5 transition-colors group", !p.is_active && "opacity-40 grayscale bg-muted/5")}>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-sm uppercase tracking-tight">{p.name}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">{p.category || 'GERAL'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-primary text-base">
                      {formatCurrency(p.price_cents)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[9px] font-black uppercase", margin > 0 ? "text-green-600" : "text-red-500")}>
                        {formatCurrency(margin)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={isLow ? 'destructive' : 'outline'} 
                        className={cn("font-black h-6 min-w-[40px] justify-center", isLow && "atrasado")}
                      >
                        {p.stock_quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-muted-foreground">
                      {p.min_stock || 0}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary hover:text-white rounded-lg" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-orange-500 hover:text-white rounded-lg" onClick={() => { setSelectedProduct(p); setIsStockOpen(true); }}>
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-600 hover:text-white rounded-lg" onClick={() => { setSelectedProduct(p); setFormData({...formData, cost_cents: ((p.cost_cents || 0)/100).toString()}); setIsCostOpen(true); }}>
                          <Coins className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-600 hover:text-white rounded-lg" onClick={() => handleSoftDelete(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32 text-muted-foreground font-black uppercase text-[10px] tracking-[0.2em] opacity-40">
                    Catálogo Vazio
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* MODAL: NOVO PRODUTO */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-primary/5 py-10 text-center border-b">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-primary/10 mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter leading-none">Novo Cadastro</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Defina os parâmetros de venda e custo</DialogDescription>
          </div>
          <form onSubmit={handleCreate} className="p-8 space-y-6 bg-background">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome do Produto *</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 font-bold rounded-xl" placeholder="Ex: Coca-Cola 350ml" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Preço de Venda (R$)</Label>
                  <Input placeholder="0,00" required value={formData.price_cents} onChange={e => setFormData({...formData, price_cents: e.target.value})} className="h-12 font-black text-primary rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Custo CMV (R$)</Label>
                  <Input placeholder="0,00" required value={formData.cost_cents} onChange={e => setFormData({...formData, cost_cents: e.target.value})} className="h-12 font-black text-orange-600 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estoque Inicial</Label>
                  <Input type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="h-12 font-bold rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mínimo Alerta</Label>
                  <Input type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} className="h-12 font-bold border-red-100 rounded-xl" />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 rounded-2xl">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar Cadastro'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-primary/5 py-10 text-center border-b">
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Editar Dados</DialogTitle>
          </div>
          <form onSubmit={handleUpdate} className="p-8 space-y-6 bg-background">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Descrição Comercial</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Preço de Venda (R$)</Label>
                <Input value={formData.price_cents} onChange={e => setFormData({...formData, price_cents: e.target.value})} className="h-12 font-black text-primary" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Venda Ativa</Label>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Disponível no Terminal PDV</p>
                </div>
                <Switch checked={formData.is_active} onCheckedChange={val => setFormData({...formData, is_active: val})} />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase text-[11px] tracking-widest shadow-lg rounded-2xl">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Salvar Alterações'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: ESTOQUE */}
      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent className="sm:max-w-xs p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-orange-50 py-10 text-center border-b border-orange-100">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-orange-100 mb-4">
              <Package className="h-6 w-6 text-orange-500" />
            </div>
            <DialogTitle className="text-xl font-black font-headline uppercase tracking-tighter text-orange-950">Movimentar</DialogTitle>
            <p className="text-[10px] font-black uppercase text-orange-600 mt-1 opacity-60 tracking-tight">{selectedProduct?.name}</p>
          </div>
          <form onSubmit={handleAdjustStock} className="p-8 space-y-6 bg-background text-center">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Quantidade (+ ou -)</Label>
              <Input 
                type="number" 
                value={stockDelta} 
                onChange={e => setStockDelta(e.target.value)} 
                className="h-16 text-center text-3xl font-black border-none bg-muted/30 rounded-2xl focus-visible:ring-orange-500/20" 
                autoFocus 
              />
              <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground mt-4 uppercase px-2">
                <span>Saldo Atual:</span>
                <span className="text-foreground">{selectedProduct?.stock_quantity}</span>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase text-[11px] tracking-widest bg-orange-500 hover:bg-orange-600 rounded-2xl">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar Ajuste'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CUSTO */}
      <Dialog open={isCostOpen} onOpenChange={setIsCostOpen}>
        <DialogContent className="sm:max-w-xs p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <div className="bg-green-50 py-10 text-center border-b border-green-100">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-green-100 mb-4">
              <Coins className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-black font-headline uppercase tracking-tighter text-green-950">Ajustar Custo</DialogTitle>
          </div>
          <form onSubmit={handleUpdateCost} className="p-8 space-y-6 bg-background">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Novo Custo de Entrada (R$)</Label>
              <Input 
                placeholder="0,00"
                value={formData.cost_cents} 
                onChange={e => setFormData({...formData, cost_cents: e.target.value})} 
                className="h-14 font-black text-2xl text-center text-green-700 rounded-xl" 
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase text-[11px] tracking-widest bg-green-600 hover:bg-green-700 rounded-2xl">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Atualizar CMV'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
