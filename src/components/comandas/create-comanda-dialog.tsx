'use client';

/**
 * @fileOverview Modal de Abertura de Atendimento v6.0
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ClipboardList, User, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const comandaSchema = z.object({
  mesa: z.coerce.number().int().min(0, 'Informe o número da mesa (0 para balcão)'),
  cliente: z.string().optional().nullable(),
});

type ComandaFormValues = z.infer<typeof comandaSchema>;

export function CreateComandaDialog({ isOpen, onOpenChange, onSuccess }: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { getOrCreateComanda, refreshStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ComandaFormValues>({
    resolver: zodResolver(comandaSchema),
    defaultValues: { 
      mesa: 1,
      cliente: '' 
    }
  });

  const handleOpenComanda = async (values: ComandaFormValues) => {
    setIsSubmitting(true);
    try {
      const comandaId = await getOrCreateComanda(Number(values.mesa), values.cliente || null);

      toast({ 
        title: 'Atendimento Iniciado', 
        description: values.mesa === 0 ? 'Balcão aberto com sucesso.' : `Mesa ${values.mesa} aberta com sucesso.` 
      });

      onOpenChange(false);
      form.reset();
      
      await refreshStatus();
      if (onSuccess) await onSuccess();
      
      router.push(`/comandas/${comandaId}`);
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Falha na Operação', 
        description: err.message || 'Não foi possível abrir a comanda.' 
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
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter text-center">Novo Atendimento</DialogTitle>
            <DialogDescription className="text-center font-medium text-sm">Informe a mesa para controle de consumo. Use "0" para pedidos diretos no balcão.</DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOpenComanda)} className="space-y-6 p-8 bg-background">
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="mesa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> Número da Mesa / Local *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 12" 
                        {...field} 
                        className="h-14 font-black text-xl border-primary/10 focus-visible:ring-primary/20 rounded-xl" 
                        autoFocus 
                      />
                    </FormControl>
                    <FormMessage className="font-bold text-[10px] uppercase text-destructive" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <User className="h-3 w-3" /> Nome do Cliente (Opcional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: João Silva" 
                        {...field} 
                        value={field.value || ''}
                        className="h-14 font-bold rounded-xl border-primary/10 focus-visible:ring-primary/20" 
                      />
                    </FormControl>
                    <FormMessage className="font-bold text-[10px] uppercase text-destructive" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 gap-3 sm:flex-row-reverse">
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-14 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 rounded-xl">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Abrir Atendimento
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-14 font-black uppercase text-[11px] tracking-widest rounded-xl" disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
