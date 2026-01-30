
'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Store, ExternalLink, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getPlanLabel } from '@/lib/plan-label';
import { format } from 'date-fns';

export default function AdminStoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          store_access (plano_tipo, status_acesso),
          users (email)
        `)
        .order('created_at', { ascending: false });

      if (!error) setStores(data || []);
    } catch (err) {
      console.error('Falha ao buscar lojas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const filteredStores = useMemo(() => {
    const term = search.toLowerCase();
    return stores.filter(s => 
      (s.name || '').toLowerCase().includes(term) || 
      (s.cnpj || '').includes(term) ||
      (s.users?.email || '').toLowerCase().includes(term)
    );
  }, [stores, search]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestão de Tenants" 
        subtitle="Visualize e gerencie todas as lojas ativas no ecossistema VendaFácil." 
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, CNPJ ou e-mail..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="h-8">
              {filteredStores.length} Lojas Encontradas
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Gestão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">Sincronizando tenants...</TableCell></TableRow>
              ) : filteredStores.map(s => {
                const access = Array.isArray(s.store_access) ? s.store_access[0] : s.store_access;
                return (
                  <TableRow key={s.id} className="group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{s.name || 'Sem Nome'}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{s.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {s.users?.email || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {getPlanLabel(access?.plano_tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={access?.status_acesso === 'ativo' ? 'default' : 'destructive'}
                        className="text-[10px] capitalize"
                      >
                        {access?.status_acesso || 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.created_at ? format(new Date(s.created_at), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/admin/stores/${s.id}`)}
                      >
                        Gerenciar <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
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
