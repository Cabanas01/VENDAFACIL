'use client';

/**
 * @fileOverview Página de Dashboard de Produtos
 * 
 * Visão gerencial do estoque e catálogo.
 */

import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.category?.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const stats = useMemo(() => {
    const totalItems = products.length;
    const lowStock = products.filter(p => p.stock_qty <= (p.min_stock_qty ?? 0)).length;
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.price_cents * p.stock_qty), 0);
    const totalCostValue = products.reduce((acc, p) => acc + ((p.cost_cents ?? 0) * p.stock_qty), 0);

    return { totalItems, lowStock, totalInventoryValue, totalCostValue };
  }, [products]);

  return (
    <div className="space-y-8">
      <PageHeader title="Produtos e Estoque" subtitle="Controle seu inventário e precificação.">
        <Button onClick={() => router.push('/products')}>
          <Plus className="h-4 w-4 mr-2" /> Gerenciar Catálogo
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Itens no Catálogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Package className="h-3 w-3 mr-1" /> Produtos ativos
            </div>
          </CardContent>
        </Card>

        <Card className={stats.lowStock > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estoque Crítico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowStock > 0 ? 'text-destructive' : ''}`}>
              {stats.lowStock}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <AlertTriangle className={`h-3 w-3 mr-1 ${stats.lowStock > 0 ? 'text-destructive' : ''}`} />
              Abaixo do mínimo
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque (Venda)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalInventoryValue)}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" /> Capital em giro
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custo Imobilizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{formatCurrency(stats.totalCostValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor pago aos fornecedores</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listagem Geral</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar por nome ou categoria..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço Venda</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => {
                const margin = p.price_cents > 0 ? ((p.price_cents - (p.cost_cents ?? 0)) / p.price_cents) * 100 : 0;
                const isLow = p.stock_qty <= (p.min_stock_qty ?? 0);
                
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">{p.name}</TableCell>
                    <TableCell>{p.category || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.price_cents)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(p.cost_cents ?? 0)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={margin > 30 ? 'text-green-600' : 'text-orange-600'}>
                        {margin.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      <span className={isLow ? 'text-destructive font-bold' : ''}>
                        {p.stock_qty}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isLow ? "destructive" : "default"}>
                        {isLow ? 'Baixo' : 'Ok'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
