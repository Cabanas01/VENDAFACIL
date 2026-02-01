'use client';

/**
 * @fileOverview Listagem de Lojas (Admin)
 * 
 * Adiciona colunas de criação e expiração conforme solicitado.
 */

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink, Mail, Calendar, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getPlanLabel } from '@/lib/plan-label';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        subtitle="Monitoramento central de unidades e licenciamento." 
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, CNPJ ou e-mail..." 
                className="pl-10 h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="h-8 font-bold uppercase text-[10px]">
              {filteredStores.length} Unidades Ativas
            </Badge>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Unidade</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Proprietário</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Plano</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Criada em</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest px-6 text-primary">Expira em</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-6">Gestão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground animate-pulse">Consultando base de dados...</TableCell></TableRow>
                ) : filteredStores.map(s => {
                  const access = Array.isArray(s.store_access) ? s.store_access[0] : s.store_access;
                  return (
                    <TableRow key={s.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="px-6">
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase tracking-tighter">{s.name || 'Sem Nome'}</span>
                          <span className="text-[9px] font-mono text-muted-foreground uppercase">{s.id.substring(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2 text-xs font-medium lowercase">
                          <Mail className="h-3 w-3 text-primary/40" />
                          {s.users?.email || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/10">
                          {getPlanLabel(access?.plano_tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 text-xs font-bold text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {s.created_at ? format(new Date(s.created_at), 'dd/MM/yyyy') : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-xs font-black uppercase tracking-tight text-foreground/80">
                        {access?.data_fim_acesso ? (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(access.data_fim_acesso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-normal italic">Sem Licença</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white"
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
