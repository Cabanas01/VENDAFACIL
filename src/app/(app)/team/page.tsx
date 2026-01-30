'use client';

/**
 * @fileOverview Gestão de Equipe e Membros
 * 
 * Permite ao proprietário visualizar e gerenciar quem tem acesso à loja.
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
      toast({ variant: 'destructive', title: 'Ação não permitida', description: 'O proprietário não pode ser removido.' });
      return;
    }

    if (!confirm('Deseja realmente remover este membro da equipe?')) return;

    setIsRemoving(memberId);
    try {
      const { error } = await removeStoreMember(memberId);
      if (error) throw error;
      toast({ title: 'Membro removido', description: 'O acesso foi revogado com sucesso.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: err.message });
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Minha Equipe" subtitle="Gerencie os colaboradores e níveis de acesso da sua loja.">
        <Button disabled>
          <UserPlus className="h-4 w-4 mr-2" /> Convidar Membro
        </Button>
      </PageHeader>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" />
              Colaboradores Ativos
            </CardTitle>
            <CardDescription>
              Lista de usuários com acesso autorizado a esta unidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted">
                            {member.name ? member.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold">{member.name || 'Usuário sem nome'}</span>
                        {member.user_id === store.user_id && (
                          <Badge variant="secondary" className="text-[10px] uppercase">Proprietário</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Shield className={`h-3 w-3 ${member.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="capitalize text-xs font-medium">{member.role === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {member.user_id !== store.user_id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(member.user_id)}
                          disabled={isRemoving === member.user_id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
