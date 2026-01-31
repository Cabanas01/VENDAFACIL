'use client';

/**
 * @fileOverview Gestão de Equipe e Membros
 * 
 * Permite ao proprietário gerenciar níveis de acesso.
 */

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, UserPlus, Trash2, Shield, User } from 'lucide-react';

export default function TeamPage() {
  const { store, user, removeStoreMember } = useAuth();
  const { toast } = useToast();
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  if (!store) return null;

  const members = store.members || [];

  const handleRemove = async (memberId: string) => {
    if (memberId === store.user_id) {
      toast({ variant: 'destructive', title: 'Operação bloqueada', description: 'O dono da loja não pode ser removido.' });
      return;
    }

    if (!confirm('Deseja realmente revogar o acesso deste membro?')) return;

    setIsRemoving(memberId);
    try {
      const { error } = await removeStoreMember(memberId);
      if (error) throw error;
      toast({ title: 'Acesso Revogado', description: 'O membro foi removido com sucesso.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: err.message });
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Minha Equipe" subtitle="Colaboradores com acesso autorizado à unidade.">
        <Button disabled variant="outline">
          <UserPlus className="h-4 w-4 mr-2" /> Convidar Membro
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" /> Membros Ativos
          </CardTitle>
          <CardDescription>Gerencie quem pode operar o PDV e visualizar relatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs uppercase font-bold">Colaborador</TableHead>
                  <TableHead className="text-xs uppercase font-bold">E-mail</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Função</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Gestão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id} className="hover:bg-muted/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/5 text-primary">
                            {member.name ? member.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold">{member.name || 'Operador'}</span>
                        {member.user_id === store.user_id && <Badge className="text-[9px] h-4 uppercase">Dono</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{member.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Shield className={`h-3 w-3 ${member.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="capitalize text-xs font-bold">{member.role === 'admin' ? 'Admin' : 'Vendedor'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {member.user_id !== store.user_id && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemove(member.user_id)} disabled={isRemoving === member.user_id}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
