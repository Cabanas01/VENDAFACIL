'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Search, 
  Loader2, 
  Phone, 
  CreditCard,
  Calendar,
  Copy,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';

export default function ClientesPage() {
  const { store } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    if (!store?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', store.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      console.error('[FETCH_CUSTOMERS_ERROR]', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar clientes' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [store?.id]);

  const filtered = useMemo(() => {
    const term = (search || '').toLowerCase();
    return (customers || []).filter(c => 
      (c.name || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term) ||
      (c.cpf || '').includes(term)
    );
  }, [customers, search]);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: `${label} na área de transferência.` });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Carregando Clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Meus Clientes" subtitle="Gestão de base e fidelização.">
        <Button className="h-10 px-4 gap-2 font-black uppercase text-xs">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border border-primary/5 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por nome, telefone ou CPF..." 
          className="border-none shadow-none focus-visible:ring-0 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase px-6">Cliente</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Contato</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Documento</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(customer => (
                <TableRow key={customer.id} className="hover:bg-primary/5">
                  <TableCell className="px-6 py-4">
                    <span className="font-black text-sm uppercase">{customer.name}</span>
                  </TableCell>
                  <TableCell className="text-center px-6">
                    <span className="text-xs font-bold text-muted-foreground">{customer.phone || '—'}</span>
                  </TableCell>
                  <TableCell className="text-center px-6">
                    <span className="text-xs font-mono">{customer.cpf || '—'}</span>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="sm" className="font-black text-[9px] uppercase tracking-widest">
                      Perfil <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-24 opacity-40 uppercase font-black text-xs tracking-widest">
                    Nenhum cliente localizado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
