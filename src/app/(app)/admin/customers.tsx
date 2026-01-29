'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { Button } from '@/components/ui/button';
import type { Customer } from '@/lib/types';

const PAGE_SIZE = 20;

type CustomerWithStore = Customer & {
  stores: {
    name: string;
    business_type: string;
  } | null;
};

export default function AdminCustomers() {
  const searchParams = useSearchParams();
  const storeIdFilter = searchParams.get('store_id');

  const [customers, setCustomers] = useState<CustomerWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 500);

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      setErrorMsg(null);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('customers')
        .select('*, stores (name, business_type)', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (storeIdFilter) {
        query = query.eq('store_id', storeIdFilter);
      }

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,cpf.ilike.%${debouncedSearch}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        setErrorMsg(`Erro ao buscar clientes: ${error.message}`);
        setCustomers([]);
      } else {
        setCustomers((data ?? []) as CustomerWithStore[]);
        setCount(count ?? 0);
      }
      setLoading(false);
    }

    loadCustomers();
  }, [page, debouncedSearch, storeIdFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes (Global)</CardTitle>
        <CardDescription>
          {storeIdFilter
            ? `Visualizando clientes da loja ${storeIdFilter}.`
            : "Visualize todos os clientes cadastrados no sistema."}
        </CardDescription>
        <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar por nome, email ou CPF..." 
                className="pl-10" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{c.stores?.name ?? 'N/A'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{c.store_id}</div>
                    </TableCell>
                    <TableCell>
                        {c.stores?.business_type ?? '-'}
                    </TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

         <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Página {page + 1} de {Math.ceil(count / PAGE_SIZE)}</p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= count || loading}>Próximo</Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
