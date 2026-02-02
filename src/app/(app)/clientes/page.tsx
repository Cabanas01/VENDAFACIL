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
  ExternalLink
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
    } catch (err) {
      console.error('[FETCH_CUSTOMERS_ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [store?.id]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return customers.filter(c => 
      (c.name || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term) ||
      (c.cpf || '').includes(term)
    );
  }, [customers, search]);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: `${label} copiado para a área de transferência.` });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Consultando CRM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Meus Clientes" subtitle="Gestão de base e fidelização.">
        <Badge variant="outline" className="h-10 px-4 gap-2 font-black uppercase text-xs border-primary/20 bg-primary/5">
          <Users className="h-4 w-4 text-primary" /> {customers.length} Cadastros
        </Badge>
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
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lista de Relacionamento</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Cliente</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6 text-center">Contato</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6 text-center">Documento</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6 text-center">Desde</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(customer => (
                <TableRow key={customer.id} className="hover:bg-primary/5 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs shadow-inner">
                        {customer.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-black text-sm uppercase tracking-tighter">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-6">
                    {customer.phone ? (
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs py-1 px-2">
                          <Phone className="h-3 w-3 mr-1 text-muted-foreground" /> {customer.phone}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(customer.phone!, 'Telefone')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-center px-6">
                    {customer.cpf ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-mono font-bold text-muted-foreground">{customer.cpf}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(customer.cpf!, 'CPF')}>
                          <CreditCard className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-center px-6">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="sm" className="font-black text-[9px] uppercase tracking-widest hover:bg-primary hover:text-white" onClick={() => router.push(`/clientes/${customer.id}`)}>
                      Perfil <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24 text-muted-foreground font-black uppercase text-xs tracking-[0.2em] italic">
                    Nenhum cliente localizado na base.
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
