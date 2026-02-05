'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ClipboardList, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const comandaSchema = z.object({
  mesa: z.string().min(1, 'Identificação é obrigatória'),
  cliente_nome: z.string().min(1, 'Nome do cliente é obrigatório'),
});

type ComandaFormValues = z.infer<typeof comandaSchema>;

export function CreateComandaDialog({ isOpen, onOpenChange, onSuccess }: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { abrirComanda } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ComandaFormValues>({
    resolver: zodResolver(comandaSchema),
    defaultValues: { mesa: '', cliente_nome: '' }
  });

  const onSubmit = async (values: ComandaFormValues) => {
    const identificacao = values.mesa?.trim();
    
    if (!identificacao) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Informe o número da mesa ou identificação da comanda.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // REGRA DE OURO: Insert direto (via abrirComanda no provider que agora envia 'numero')
      const comandaId = await abrirComanda(identificacao, values.cliente_nome);

      if (comandaId) {
        toast({ title: 'Atendimento Iniciado!', description: `Mesa ${identificacao} aberta com sucesso.` });
        onOpenChange(false);
        form.reset();
        router.push(`/comandas/${comandaId}`);
      }
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Falha ao Abrir', 
        description: err.message || 'Verifique sua conexão e tente novamente.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <div className="bg-primary/5 pt-10 pb-6 px-8 text-center border-b border-primary/10">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-primary/10 mb-4">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter text-center">Abrir Comanda</DialogTitle>
            <DialogDescription className="text-center font-medium text-sm">Inicie um novo atendimento de mesa ou balcão.</DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-8 bg-background">
            <FormField
              control={form.control}
              name="mesa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identificação (Mesa / Local) *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 15 ou Balcão" {...field} className="h-12 font-bold focus-visible:ring-primary/20" autoFocus />
                  </FormControl>
                  <FormMessage className="font-bold" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliente_nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Cliente *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="Como devemos chamar o cliente?" {...field} className="h-12 pl-10 font-bold" />
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage className="font-bold" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 gap-3 sm:flex-row-reverse">
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Abrir Atendimento
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 font-black uppercase text-[11px] tracking-widest">
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
