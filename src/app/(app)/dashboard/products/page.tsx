'use client';

/**
 * @fileOverview Página de Dashboard de Produtos
 * 
 * Visão gerencial do estoque e catálogo.
 */

import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, AlertTriangle, ArrowUpRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function ProductsDashboardPage() {
  const { products } = useAuth();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filteredProducts = useMemo(() => {
    const term = (search || '').toLowerCase();
    return products.filter(p => {
      const productName = (p?.name || '').toLowerCase();
      const productCat = (p?.category || '').toLowerCase();
      return productName.includes(term) || productCat.includes(term);
    });
  }, [products, search]);

  const stats = useMemo(() => {
    const totalItems = products.length;
    const lowStock = products.filter(p => p.stock_qty <= (p.min_stock_qty || 0)).length;
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.price_cents * p.stock_qty), 0);
    const totalCostValue = products.reduce((acc, p) => acc + ((p.cost_cents || 0) * p.stock_qty), 0);

    return { totalItems, lowStock, totalInventoryValue, totalCostValue };
  }, [products]);

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

        <Card className={stats.lowStock > 0 ? "border-destructive/50" : ""}>
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
          <div className="flex items-center justify-between">
            <CardTitle>Inventário Consolidado</CardTitle>
            <div className="relative w-72">
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
                  const margin = p.price_cents > 0 ? ((p.price_cents - (p.cost_cents || 0)) / p.price_cents) * 100 : 0;
                  const isLow = p.stock_qty <= (p.min_stock_qty || 0);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold">{p.name}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(p.price_cents)}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">{formatCurrency(p.cost_cents || 0)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={margin > 30 ? 'text-green-600' : 'text-orange-600'}>
                          {margin.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-black">
                        <span className={isLow ? 'text-destructive' : 'text-primary'}>{p.stock_qty}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
