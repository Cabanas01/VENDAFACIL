
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Lock, Trash2, Users, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrantPlanDialog } from './grant-plan-dialog';
import { getPlanLabel } from '@/lib/plan-label';

export type StoreRow = {
  id: string;
  name: string | null;
  user_id: string | null;
  owner_email?: string | null;
  status: 'active' | 'trial' | 'suspended' | 'blocked' | 'deleted';
  business_type: string;
  store_access: {
    plano_tipo: string;
  } | null;
};

const businessCategories = ['general', 'restaurant', 'hamburgueria', 'pizzaria', 'acai', 'mercearia', 'farmacia', 'barbearia', 'salao', 'outros'];
const categoryLabels: Record<string, string> = {
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

const statusConfig: Record<StoreRow['status'], { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
    active: { variant: 'default', label: 'Ativa', className: 'bg-green-500' },
    trial: { variant: 'default', label: 'Trial', className: 'bg-blue-500' },
    suspended: { variant: 'outline', label: 'Suspensa' },
    blocked: { variant: 'destructive', label: 'Bloqueada' },
    deleted: { variant: 'destructive', label: 'Excluída' },
};


export default function AdminStores() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const router = useRouter();

  const fetchStores = async () => {
    setLoading(true);
    setErrorMsg(null);

    let query = supabase
      .from('stores')
      .select('id, name, user_id, status, business_type, store_access(plano_tipo)');

    if (activeTab !== 'all') {
      query = query.eq('business_type', activeTab);
    }
    
    const { data: storesData, error: storesError } = await query;

    if (storesError) {
      setErrorMsg(`Erro ao buscar lojas: ${storesError.message}`);
      setStores([]);
      setLoading(false);
      return;
    }
    
    if (!storesData || storesData.length === 0) {
      setStores([]);
      setLoading(false);
      return;
    }

    const ownerIds = [...new Set(storesData.map(s => s.user_id).filter(Boolean))];
    let ownerEmailMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', ownerIds as string[]);

      if (usersError) {
        console.warn("Could not fetch owner emails:", usersError.message);
      } else {
        ownerEmailMap = new Map((usersData ?? []).map(u => [u.id, u.email as string]));
      }
    }
    
    const combinedData = storesData.map((store) => ({
      ...store,
      owner_email: store.user_id ? ownerEmailMap.get(store.user_id) : 'N/A',
    }));

    setStores(combinedData as StoreRow[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchStores();
  }, [activeTab]);

  const handleOpenGrantModal = (store: StoreRow) => {
    setSelectedStore(store);
    setIsGrantModalOpen(true);
  };

  const renderTable = (storeList: StoreRow[]) => {
      if (loading) {
          return (
             <div className="space-y-2 pt-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
          );
      }
      if (storeList.length === 0 && !errorMsg) {
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
                <TableHead>Loja</TableHead>
                <TableHead>Dono (Email)</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeList.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name ?? '-'}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.id}</div>
                  </TableCell>
                  <TableCell>{s.owner_email ?? '-'}</TableCell>
                   <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {getPlanLabel(s.store_access?.plano_tipo)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[s.status].variant} className={`${statusConfig[s.status].className ?? ''} capitalize`}>
                      {statusConfig[s.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem onSelect={() => router.push(`/admin?tab=customers&store_id=${s.id}`)}>
                           <Users className="mr-2 h-4 w-4" /> Ver Clientes
                         </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleOpenGrantModal(s)}>
                            <Gift className="mr-2 h-4 w-4" /> Conceder Plano
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Lock className="mr-2 h-4 w-4" /> Suspender
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
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
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Lojas</CardTitle>
          <CardDescription>Visualize e gerencie todas as lojas (tenants) do sistema, segmentadas por categoria.</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-11">
              {businessCategories.map(cat => (
                  <TabsTrigger key={cat} value={cat}>{categoryLabels[cat]}</TabsTrigger>
              ))}
            </TabsList>
            {businessCategories.map(cat => (
                <TabsContent key={cat} value={cat}>
                  {renderTable(stores)}
                </TabsContent>
              ))}
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
