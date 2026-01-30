'use client';

/**
 * @fileOverview Listagem Global de Lojas (Tenants)
 * 
 * Permite ao administrador visualizar todas as lojas cadastradas no sistema,
 * seus donos, planos atuais e status de operação.
 */

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
          store_access (plano_tipo, status_acesso, data_fim_acesso),
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
    const term = (search || '').toLowerCase();
    return stores.filter(s => {
      const storeName = (s?.name || '').toLowerCase();
      const storeCnpj = (s?.cnpj || '').toLowerCase();
      const ownerEmail = (s?.users?.email || '').toLowerCase();
      return storeName.includes(term) || storeCnpj.includes(term) || ownerEmail.includes(term);
    });
  }, [stores, search]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestão de Lojas" 
        subtitle="Controle central de todos os tenants e licenciamentos do SaaS." 
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, CNPJ ou email do dono..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Store className="h-4 w-4" />
              {filteredStores.length} lojas registradas
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja / ID</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status Acesso</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">Carregando lojas...</TableCell></TableRow>
              ) : filteredStores.map(s => {
                const access = Array.isArray(s?.store_access) ? s.store_access[0] : s?.store_access;
                return (
                  <TableRow key={s?.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{s?.name || 'Sem Nome'}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{s?.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {s?.users?.email || 'N/A'}
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
                        {access?.status_acesso || 'Sem Acesso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s?.created_at ? format(new Date(s.created_at), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => router.push(`/admin/stores/${s?.id}`)}
                      >
                        Detalhes
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filteredStores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma loja encontrada para esta busca.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
