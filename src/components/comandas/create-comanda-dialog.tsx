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
      // Chama a RPC de abertura que já cuida do CRM e da Comanda
      const { data, error } = await supabase.rpc('abrir_comanda', {
        p_store_id: store.id,
        p_mesa: values.mesa,
        p_cliente_nome: values.cliente_nome,
        p_cliente_telefone: values.cliente_telefone || null,
        p_cliente_cpf: values.cliente_cpf || null,
      });

      if (error) throw error;

      toast({ title: 'Comanda Aberta!', description: `Mesa ${values.mesa} para ${values.cliente_nome}.` });
      
      onOpenChange(false);
      form.reset();
      if (onSuccess) onSuccess();
      
      if (data && (data as any).comanda_id) {
        router.push(`/comandas/${(data as any).comanda_id}`);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao abrir comanda', description: err.message });
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
          <DialogDescription>Inicie um novo atendimento registrando mesa e cliente.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="mesa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mesa / Identificador *</FormLabel>
                  <FormControl><Input placeholder="Ex: 25" {...field} className="h-12 font-bold" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <UserPlus className="h-3 w-3" /> CRM - Cadastro de Cliente
              </h4>
              
              <FormField
                control={form.control}
                name="cliente_nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Nome do Cliente *</FormLabel>
                    <FormControl><Input placeholder="Nome completo" {...field} className="h-11" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cliente_telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase">WhatsApp</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input placeholder="11999999999" className="pl-9 h-11 text-xs" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cliente_cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase">CPF</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input placeholder="000.000.000-00" className="pl-9 h-11 text-xs" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="h-12 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Confirmar Abertura'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}