'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { StoreSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const inviteUserSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'staff']),
});

type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export default function SettingsPage() {
    const { user, store, updateStore, updateUser, removeStoreMember, deleteAccount } = useAuth();
    const { toast } = useToast();

    // Company Tab State
    const [companyData, setCompanyData] = useState({
        name: '',
        legal_name: '',
        cep: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
    });

    // Profile Tab State
    const [userData, setUserData] = useState({ name: '' });
    
    // Settings Tab State
    const [settings, setSettings] = useState<Partial<StoreSettings>>({});

    // Users Tab State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    
    const logoInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const inviteForm = useForm<InviteUserFormValues>({
        resolver: zodResolver(inviteUserSchema),
        defaultValues: { email: '', role: 'staff' }
    });

    useEffect(() => {
        if (store) {
            setCompanyData({
                name: store.name || '',
                legal_name: store.legal_name || '',
                cep: store.address?.cep || '',
                street: store.address?.street || '',
                number: store.address?.number || '',
                neighborhood: store.address?.neighborhood || '',
                city: store.address?.city || '',
            });
            setSettings(store.settings || {});
        }
        if (user) {
            setUserData({ name: user.name || '' });
        }
    }, [store, user]);
    
    if (!store || !user) {
        return (
            <>
                <PageHeader title="Configurações" subtitle="Gerencie as configurações da sua loja e do sistema." />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </>
        );
    }

    const members = store?.members || [];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'avatar') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                if (type === 'logo') {
                    updateStore({ logo_url: base64String });
                } else {
                    updateUser({ avatar_url: base64String });
                }
                toast({ title: 'Imagem atualizada!' });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCompanySave = async () => {
        await updateStore({
            name: companyData.name,
            legal_name: companyData.legal_name,
            address: {
                ...store.address,
                cep: companyData.cep,
                street: companyData.street,
                number: companyData.number,
                neighborhood: companyData.neighborhood,
                city: companyData.city,
            }
        });
        toast({ title: 'Sucesso!', description: 'Informações da empresa foram salvas.' });
    }
    
    const handleProfileSave = async () => {
        await updateUser({ name: userData.name });
        toast({ title: 'Sucesso!', description: 'Seu perfil foi atualizado.' });
    };
    
    const handleSettingsSave = async () => {
        await updateStore({ settings });
        toast({ title: 'Sucesso!', description: 'Configurações salvas.' });
    }
    
    const handleInviteUser = (values: InviteUserFormValues) => {
        // This would be a backend call to invite a user
        console.log("Inviting user", values);
        toast({ title: 'Convite enviado (simulado)'});
        setIsInviteModalOpen(false);
        inviteForm.reset();
    }
    
    const handleRemoveUser = async (userId: string) => {
       if (confirm('Tem certeza que deseja remover este usuário da loja?')) {
            const { error } = await removeStoreMember(userId);
            if (error) {
                toast({ variant: 'destructive', title: 'Erro ao remover', description: error.message });
            } else {
                toast({ title: 'Usuário removido com sucesso!' });
            }
       }
    }
    
    const handleDeleteAccount = async () => {
        toast({ title: "Excluindo sua conta...", description: "Aguarde um momento." });
        const { error } = await deleteAccount();
        if (error) {
            toast({ variant: "destructive", title: "Erro ao excluir conta", description: error.message });
        } else {
            toast({ title: "Conta excluída", description: "Sua conta e todos os dados foram removidos."});
            // O provedor de autenticação irá redirecionar automaticamente.
        }
    }

  return (
    <>
      <PageHeader title="Configurações" subtitle="Gerencie as configurações da sua loja e do sistema." />
      
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>
              Envie um convite para alguém se juntar à sua loja.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInviteUser)} className="space-y-4 py-4">
                <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email do usuário</FormLabel>
                        <FormControl>
                            <Input placeholder="usuario@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={inviteForm.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Permissão</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a permissão" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="staff">Vendedor</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Convidar</Button>
                </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="empresa" className="flex flex-col md:flex-row gap-8">
        <TabsList className="flex-col h-auto justify-start items-start md:w-1/5 bg-transparent p-0">
          <TabsTrigger value="meu-perfil" className="w-full justify-start">Meu Perfil</TabsTrigger>
          <TabsTrigger value="empresa" className="w-full justify-start">Empresa</TabsTrigger>
          <TabsTrigger value="operacao" className="w-full justify-start">Operação do PDV</TabsTrigger>
          <TabsTrigger value="caixa" className="w-full justify-start">Caixa & Financeiro</TabsTrigger>
          <TabsTrigger value="produtos" className="w-full justify-start">Produtos & Estoque</TabsTrigger>
          <TabsTrigger value="impressao" className="w-full justify-start">Impressão</TabsTrigger>
          <TabsTrigger value="usuarios" className="w-full justify-start">Usuários & Acessos</TabsTrigger>
          <TabsTrigger value="seguranca" className="w-full justify-start text-red-500">Segurança & Conta</TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="meu-perfil">
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>Gerencie suas informações pessoais e avatar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Avatar</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 rounded-full">
                            <AvatarImage src={user?.avatar_url ?? undefined} />
                            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" onClick={() => avatarInputRef.current?.click()}>
                            Alterar Avatar
                        </Button>
                        <input
                            type="file"
                            ref={avatarInputRef}
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => handleFileChange(e, 'avatar')}
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="userName">Nome</Label>
                    <Input id="userName" value={userData.name} onChange={(e) => setUserData({...userData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="userEmail">Email</Label>
                    <Input id="userEmail" value={user?.email} readOnly disabled />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleProfileSave}>Salvar Alterações</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="empresa">
            <Card>
              <CardHeader>
                <CardTitle>Empresa e Endereço</CardTitle>
                <CardDescription>Informações fiscais e de localização da sua loja.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Logo da Empresa</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 rounded-lg">
                            <AvatarImage src={store?.logo_url ?? undefined} />
                            <AvatarFallback>{store?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" onClick={() => logoInputRef.current?.click()}>
                            Alterar Logo
                        </Button>
                        <input
                            type="file"
                            ref={logoInputRef}
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => handleFileChange(e, 'logo')}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="tradeName">Nome Fantasia</Label>
                        <Input id="tradeName" value={companyData.name} onChange={(e) => setCompanyData({...companyData, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="legalName">Razão Social</Label>
                        <Input id="legalName" value={companyData.legal_name} onChange={(e) => setCompanyData({...companyData, legal_name: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" value={store?.cnpj} readOnly disabled />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-1">
                        <Label htmlFor="cep">CEP</Label>
                        <Input id="cep" value={companyData.cep} onChange={(e) => setCompanyData({...companyData, cep: e.target.value})} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="street">Rua</Label>
                        <Input id="street" value={companyData.street} onChange={(e) => setCompanyData({...companyData, street: e.target.value})} />
                    </div>
                </div>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="number">Número</Label>
                        <Input id="number" value={companyData.number} onChange={(e) => setCompanyData({...companyData, number: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input id="neighborhood" value={companyData.neighborhood} onChange={(e) => setCompanyData({...companyData, neighborhood: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" value={companyData.city} onChange={(e) => setCompanyData({...companyData, city: e.target.value})} />
                    </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleCompanySave}>Salvar Alterações</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="operacao">
             <Card>
              <CardHeader>
                <CardTitle>Operação do PDV</CardTitle>
                <CardDescription>Configure como o sistema se comporta durante as vendas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="block-no-stock">Bloquear venda sem estoque</Label>
                  <Switch id="block-no-stock" checked={settings.blockSaleWithoutStock ?? true} onCheckedChange={(checked) => setSettings({...settings, blockSaleWithoutStock: checked })} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="confirm-sale">Confirmar antes de finalizar venda</Label>
                  <Switch id="confirm-sale" checked={settings.confirmBeforeFinalizingSale ?? false} onCheckedChange={(checked) => setSettings({...settings, confirmBeforeFinalizingSale: checked })} />
                </div>
              </CardContent>
               <CardFooter><Button onClick={handleSettingsSave}>Salvar Alterações</Button></CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="caixa">
             <Card>
              <CardHeader>
                <CardTitle>Caixa e Financeiro</CardTitle>
                <CardDescription>Defina as regras para abertura e fechamento de caixa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="allow-sale-no-cashier">Permitir vendas sem caixa aberto</Label>
                  <Switch id="allow-sale-no-cashier" checked={settings.allowSaleWithoutOpenCashRegister ?? false} onCheckedChange={(checked) => setSettings({...settings, allowSaleWithoutOpenCashRegister: checked })} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="auto-close">Tipo de fechamento automático (abertura + vendas)</Label>
                  <Switch id="auto-close" checked={true} disabled />
                </div>
              </CardContent>
               <CardFooter><Button onClick={handleSettingsSave}>Salvar Alterações</Button></CardFooter>
            </Card>
          </TabsContent>
          
           <TabsContent value="produtos">
             <Card>
              <CardHeader>
                <CardTitle>Produtos e Estoque</CardTitle>
                <CardDescription>Configurações sobre precificação e controle de estoque.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="allow-negative-stock">Permitir estoque negativo</Label>
                  <Switch id="allow-negative-stock" checked={settings.allowNegativeStock ?? false} onCheckedChange={(checked) => setSettings({...settings, allowNegativeStock: checked })} />
                </div>
                <div className="space-y-2 p-4 border rounded-lg">
                    <Label htmlFor="default-profit">% lucro padrão para novos produtos</Label>
                    <Input id="default-profit" type="number" value={settings.defaultProfitMargin ?? ''} onChange={(e) => setSettings({...settings, defaultProfitMargin: Number(e.target.value)})} className="w-24" />
                </div>
                 <div className="space-y-2 p-4 border rounded-lg">
                    <Label htmlFor="min-stock">Estoque mínimo padrão</Label>
                    <Input id="min-stock" type="number" value={settings.defaultMinStock ?? ''} onChange={(e) => setSettings({...settings, defaultMinStock: Number(e.target.value)})} className="w-24" />
                </div>
              </CardContent>
               <CardFooter><Button onClick={handleSettingsSave}>Salvar Alterações</Button></CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="impressao">
             <Card>
              <CardHeader>
                <CardTitle>Impressão e Recibos</CardTitle>
                <CardDescription>Configure a aparência dos seus cupons de venda.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-2 p-4 border rounded-lg">
                    <Label>Largura do Cupom</Label>
                    <Select
                        value={settings.receiptWidth ?? '80mm'}
                        onValueChange={(value: '58mm' | '80mm') => setSettings({...settings, receiptWidth: value})}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="80mm">80mm (padrão)</SelectItem>
                            <SelectItem value="58mm">58mm</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Escolha a largura de papel da sua impressora térmica.</p>
                </div>
              </CardContent>
               <CardFooter><Button onClick={handleSettingsSave}>Salvar Alterações</Button></CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle>Usuários e Acessos</CardTitle>
                <CardDescription>Gerencie quem tem acesso à sua loja e suas permissões.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Membros da equipe</h3>
                    <Button onClick={() => setIsInviteModalOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />Convidar Usuário
                    </Button>
                </div>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Permissão</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.map((member) => (
                           <TableRow key={member.user_id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.avatar_url ?? undefined} />
                                            <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>{member.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{member.email}</TableCell>
                                <TableCell>
                                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                        {member.role === 'admin' ? 'Admin' : 'Vendedor'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {member.user_id !== store.user_id && (
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveUser(member.user_id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </TableCell>
                           </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguranca">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Área de Risco</CardTitle>
                <CardDescription>Ações nesta seção são permanentes e não podem ser desfeitas.</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">Excluir Conta e Loja</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação é irreversível. Todos os dados da sua conta e da sua loja, incluindo produtos, vendas e históricos, serão permanentemente excluídos.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteAccount}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Sim, excluir tudo
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}
