
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ClipboardList, UserPlus, Phone, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const comandaSchema = z.object({
  mesa: z.string().min(1, 'Mesa é obrigatória'),
  cliente_nome: z.string().min(1, 'Nome do cliente é obrigatório'),
  cliente_telefone: z.string().optional(),
  cliente_cpf: z.string().optional(),
});

type ComandaFormValues = z.infer<typeof comandaSchema>;

export function CreateComandaDialog({ isOpen, onOpenChange, onSuccess }: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { store } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ComandaFormValues>({
    resolver: zodResolver(comandaSchema),
    defaultValues: { mesa: '', cliente_nome: '', cliente_telefone: '', cliente_cpf: '' }
  });

  const onSubmit = async (values: ComandaFormValues) => {
    if (!store?.id) return;
    setIsSubmitting(true);

    try {
      // Ao abrir, a comanda recebe status 'aberta' (regra de backend ou default)
      const { data, error } = await supabase.rpc('abrir_comanda', {
        p_store_id: store.id,
        p_mesa: values.mesa,
        p_cliente_nome: values.cliente_nome,
        p_cliente_telefone: values.cliente_telefone || null,
        p_cliente_cpf: values.cliente_cpf || null,
      });

      if (error) throw error;

      let comandaId = null;
      if (typeof data === 'string') {
        comandaId = data;
      } else if (data && typeof data === 'object') {
        comandaId = (data as any).comanda_id || (data as any).id;
      }
      
      if (comandaId && comandaId !== 'undefined') {
        toast({ title: 'Comanda Aberta!' });
        onOpenChange(false);
        form.reset();
        router.push(`/comandas/${comandaId}`);
      } else {
        onOpenChange(false);
        form.reset();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao abrir', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Abrir Comanda
          </DialogTitle>
          <DialogDescription>Inicie um novo atendimento com status 'aberta'.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="mesa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mesa *</FormLabel>
                  <FormControl><Input placeholder="Ex: 10" {...field} className="h-12 font-bold" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <UserPlus className="h-3 w-3" /> Identificação
              </h4>
              
              <FormField
                control={form.control}
                name="cliente_nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Nome *</FormLabel>
                    <FormControl><Input placeholder="Nome do cliente" {...field} className="h-11" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="h-12 font-black uppercase tracking-widest">
                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Abrir Atendimento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
