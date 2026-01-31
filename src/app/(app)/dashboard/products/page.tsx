'use client';

/**
 * @fileOverview Página de Dashboard de Produtos
 * 
 * Visão gerencial do estoque e catálogo.
 * Implementação defensiva para evitar exceções client-side.
 */

import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

export default function ProductsDashboardPage() {
  const { products } = useAuth();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const safeProducts = useMemo(() => Array.isArray(products) ? products : [], [products]);

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    return safeProducts.filter(p => {
      const productName = (p?.name || '').toLowerCase();
      const productCat = (p?.category || '').toLowerCase();
      const productBarcode = (p?.barcode || '').toLowerCase();
      return productName.includes(term) || productCat.includes(term) || productBarcode.includes(term);
    });
  }, [safeProducts, search]);

  const stats = useMemo(() => {
    const totalItems = safeProducts.length;
    const lowStock = safeProducts.filter(p => (p.stock_qty || 0) <= (p.min_stock_qty || 0)).length;
    const totalInventoryValue = safeProducts.reduce((acc, p) => acc + ((p.price_cents || 0) * (p.stock_qty || 0)), 0);
    const totalCostValue = safeProducts.reduce((acc, p) => acc + ((p.cost_cents || 0) * (p.stock_qty || 0)), 0);

    return { totalItems, lowStock, totalInventoryValue, totalCostValue };
  }, [safeProducts]);

  return (
    <div className="space-y-8">
      <PageHeader title="Produtos e Estoque" subtitle="Controle seu inventário e precificação estratégica.">
        <Button onClick={() => router.push('/products')}>
          <Plus className="h-4 w-4 mr-2" /> Gerenciar Catálogo
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Itens no Catálogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.totalItems}</div>
          </CardContent>
        </Card>

        <Card className={stats.lowStock > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Estoque Crítico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${stats.lowStock > 0 ? 'text-destructive' : ''}`}>{stats.lowStock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Valor em Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{formatCurrency(stats.totalInventoryValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Capital Imobilizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-muted-foreground">{formatCurrency(stats.totalCostValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Inventário Consolidado</CardTitle>
              <CardDescription>Resumo de preços, custos e margens brutas.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar produtos..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs uppercase font-bold">Produto</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Venda</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Custo (CMV)</TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold">Margem</TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold">Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(p => {
                  const price = p.price_cents || 0;
                  const cost = p.cost_cents || 0;
                  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                  const isLow = (p.stock_qty || 0) <= (p.min_stock_qty || 0);
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/5">
                      <TableCell className="font-bold">
                        <div className="flex flex-col">
                          <span>{p.name || 'Sem Nome'}</span>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">{p.barcode || p.id.substring(0,8)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(price)}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">{formatCurrency(cost)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={margin > 30 ? 'text-green-600 border-green-200' : margin > 15 ? 'text-orange-600 border-orange-200' : 'text-red-600 border-red-200'}>
                          {margin.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-black ${isLow ? 'text-destructive' : 'text-primary'}`}>{p.stock_qty || 0}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground text-sm">
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}