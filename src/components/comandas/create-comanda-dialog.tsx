'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ClipboardList, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const comandaSchema = z.object({
  mesa: z.coerce.number().int().min(1, 'Informe o número da mesa'),
  cliente: z.string().optional().transform(val => val && val.trim() !== '' ? val.trim() : null),
});

type ComandaFormValues = z.infer<typeof comandaSchema>;

export function CreateComandaDialog({ isOpen, onOpenChange, onSuccess }: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { getOpenSale } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ComandaFormValues>({
    resolver: zodResolver(comandaSchema),
    defaultValues: { 
      mesa: 0,
      cliente: '' 
    }
  });

  const onSubmit = async (values: ComandaFormValues) => {
    setIsSubmitting(true);
    try {
      // Chama a wrapper que possui fallback para Schema Cache
      const saleId = await getOpenSale(values.mesa, values.cliente || null);

      toast({ 
        title: 'Atendimento Iniciado', 
        description: `Mesa ${values.mesa} pronta para lançamento.` 
      });

      onOpenChange(false);
      form.reset();
      
      if (onSuccess) await onSuccess();
      router.push(`/comandas/${saleId}`);
    } catch (err: any) {
      const isSchemaError = err.message.includes('schema cache') || err.message.includes('not found');
      
      toast({ 
        variant: 'destructive', 
        title: isSchemaError ? 'Sincronização em andamento' : 'Erro ao abrir mesa', 
        description: isSchemaError 
          ? 'O servidor está atualizando as regras de negócio. Aguarde 30s e tente novamente.' 
          : err.message 
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
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter">Iniciar Atendimento</DialogTitle>
            <DialogDescription className="text-sm font-medium">Informe a mesa para controle de consumo.</DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-8 bg-background">
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="mesa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número da Mesa / Local *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 12" 
                        {...field} 
                        className="h-12 font-bold focus-visible:ring-primary/20" 
                        autoFocus 
                      />
                    </FormControl>
                    <FormMessage className="font-bold text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Cliente (Opcional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input 
                          placeholder="Ex: Cliente Mesa 12" 
                          {...field} 
                          value={field.value || ''}
                          className="h-12 pl-10 font-bold focus-visible:ring-primary/20" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="font-bold text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 gap-3 sm:flex-row-reverse">
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar Abertura
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 font-black uppercase text-[11px] tracking-widest" disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
