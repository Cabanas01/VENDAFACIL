
'use client';

/**
 * @fileOverview Gestão de Tenants (Admin) - Versão com Abas
 * 
 * Exibe todas as lojas do sistema com proteção contra dados inconsistentes.
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Lock, Trash2, Gift, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrantPlanDialog } from './grant-plan-dialog';
import { getPlanLabel } from '@/lib/plan-label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type StoreRow = {
  id: string;
  name: string | null;
  user_id: string | null;
  owner_email?: string | null;
  status: string;
  business_type: string;
  store_access: any;
};

const businessCategories = ['all', 'general', 'restaurant', 'hamburgueria', 'pizzaria', 'acai', 'mercearia', 'farmacia', 'barbearia', 'salao', 'outros'];
const categoryLabels: Record<string, string> = {
  all: 'Todas',
  general: 'Geral',
  restaurant: 'Restaurante',
  hamburgueria: 'Hamburgueria',
  pizzaria: 'Pizzaria',
  acai: 'Açaí',
  mercearia: 'Mercearia',
  farmacia: 'Farmácia',
  barbearia: 'Barbearia',
  salao: 'Salão',
  outros: 'Outros',
};

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
    active: { variant: 'default', label: 'Ativa', className: 'bg-green-500' },
    ativo: { variant: 'default', label: 'Ativa', className: 'bg-green-500' },
    trial: { variant: 'default', label: 'Trial', className: 'bg-blue-500' },
    suspended: { variant: 'outline', label: 'Suspensa' },
    suspensa: { variant: 'outline', label: 'Suspensa' },
    blocked: { variant: 'destructive', label: 'Bloqueada' },
    bloqueada: { variant: 'destructive', label: 'Bloqueada' },
    deleted: { variant: 'destructive', label: 'Excluída' },
    excluida: { variant: 'destructive', label: 'Excluída' },
};

export default function AdminStores() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const router = useRouter();

  const fetchStores = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      let query = supabase
        .from('stores')
        .select('id, name, user_id, status, business_type, store_access(plano_tipo, data_fim_acesso)');

      if (activeTab !== 'all') {
        query = query.eq('business_type', activeTab);
      }
      
      const { data: storesData, error } = await query;
      if (error) throw error;

      const safeStores = Array.isArray(storesData) ? storesData : [];
      
      const ownerIds = [...new Set(safeStores.map(s => s.user_id).filter(Boolean))];
      let ownerEmailMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', ownerIds as string[]);

        ownerEmailMap = new Map((usersData || []).map(u => [u.id, u.email as string]));
      }
      
      const combinedData = safeStores.map((store) => ({
        ...store,
        status: store.status || 'trial',
        owner_email: store.user_id ? ownerEmailMap.get(store.user_id) : 'N/A',
      }));

      setStores(combinedData as StoreRow[]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao buscar lojas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStores();
  }, [activeTab]);

  const renderTable = (storeList: StoreRow[]) => {
      if (loading) {
          return (
             <div className="space-y-4 pt-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          );
      }
      const safeList = Array.isArray(storeList) ? storeList : [];
      if (safeList.length === 0) {
          return (
            <div className="text-center text-sm text-muted-foreground p-8">
                Nenhuma loja encontrada nesta categoria.
            </div>
          );
      }
      return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Loja</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Dono (Email)</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Plano</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Expira em</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeList.map(s => {
                const accessArray = Array.isArray(s?.store_access) ? s.store_access : [];
                const access = accessArray[0] || s?.store_access;
                const config = statusConfig[s?.status?.toLowerCase()] || { variant: 'outline', label: s?.status || 'N/A' };
                
                return (
                  <TableRow key={s?.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="px-6">
                      <div className="font-black text-sm uppercase tracking-tighter">{s?.name || 'Sem Nome'}</div>
                      <div className="text-[9px] text-muted-foreground font-mono uppercase">{s?.id.substring(0, 8)}</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium px-6">{s?.owner_email || '-'}</TableCell>
                     <TableCell className="px-6">
                      <Badge variant="outline" className="capitalize text-[10px] font-black tracking-widest bg-primary/5 text-primary border-primary/10">
                        {getPlanLabel(access?.plano_tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6">
                      <Badge variant={config.variant} className={`${config.className ?? ''} font-black text-[9px] uppercase tracking-widest`}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 text-xs font-black uppercase tracking-tight text-foreground/80">
                      {access?.data_fim_acesso ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-primary/40" />
                          {format(new Date(access.data_fim_acesso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-normal">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-primary hover:text-white"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                           <DropdownMenuItem onClick={() => router.push(`/admin/stores/${s?.id}`)}>
                             <Eye className="mr-2 h-4 w-4" /> Detalhes da Unidade
                           </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setSelectedStore(s); setIsGrantModalOpen(true); }}>
                              <Gift className="mr-2 h-4 w-4" /> Conceder Licença
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500 font-bold">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
      );
  }

  return (
    <>
      <GrantPlanDialog 
        store={selectedStore}
        isOpen={isGrantModalOpen}
        onOpenChange={setIsGrantModalOpen}
        onSuccess={fetchStores}
      />
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="font-headline font-black uppercase tracking-tighter">Unidades Registradas</CardTitle>
          <CardDescription className="text-xs font-medium">Controle central de licenciamento e status das lojas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {errorMsg && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription className="font-bold">{errorMsg}</AlertDescription>
              </Alert>
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 pt-4 bg-muted/5">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
                {businessCategories.map(cat => (
                    <TabsTrigger 
                      key={cat} 
                      value={cat} 
                      className="data-[state=active]:bg-primary data-[state=active]:text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 border rounded-md"
                    >
                      {categoryLabels[cat]}
                    </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {businessCategories.map(cat => (
                <TabsContent key={cat} value={cat} className="mt-0">
                  {renderTable(stores)}
                </TabsContent>
              ))}
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
