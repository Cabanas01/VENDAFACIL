'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { StoreRow } from './stores';
import { grantPlanAction } from '@/app/actions/admin-actions';

const PLAN_OPTIONS = [
  { label: 'Avaliação (7 dias)', value: 'trial' },
  { label: 'Semanal', value: 'semanal' },
  { label: 'Mensal', value: 'mensal' },
  { label: 'Anual', value: 'anual' },
] as const;

const grantPlanSchema = z.object({
  plan: z.enum(['trial', 'semanal', 'mensal', 'anual'], { required_error: 'Selecione um plano.' }),
  durationMonths: z.coerce.number().int().min(1, 'Duração deve ser de no mínimo 1 mês.'),
});

type GrantPlanFormValues = z.infer<typeof grantPlanSchema>;

type GrantPlanDialogProps = {
  store: StoreRow | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
};

export function GrantPlanDialog({ store, isOpen, onOpenChange, onSuccess }: GrantPlanDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GrantPlanFormValues>({
    resolver: zodResolver(grantPlanSchema),
    defaultValues: {
      plan: 'mensal',
      durationMonths: 1,
    },
  });

  const onSubmit = async (values: GrantPlanFormValues) => {
    if (!store) return;
    setIsSubmitting(true);

    const calculatedDays = values.plan === 'trial' ? 7 : Number(values.durationMonths) * 30;

    try {
      const result = await grantPlanAction({
        storeId: store.id,
        planoTipo: values.plan.toLowerCase(), // Normalização forçada
        duracaoDias: calculatedDays,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: 'Sucesso!',
        description: `O plano ${values.plan} foi aplicado à loja "${store.name}".`,
      });
      
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Operação',
        description: error.message === 'not admin' 
          ? 'Acesso negado: Sua identidade de administrador não foi confirmada pelo servidor.' 
          : (error.message || 'Erro inesperado ao processar a concessão.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!store) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="absolute right-4 top-4 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-primary/5 pt-10 pb-6 px-6 text-center space-y-4">
          <div className="mx-auto bg-white p-3 rounded-2xl shadow-sm border border-primary/10 w-fit">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter text-center">Conceder Acesso Manual</DialogTitle>
            <DialogDescription className="text-center text-sm font-medium leading-relaxed px-4">
              Ajuste a licença da loja <span className="font-black text-foreground">"{store.name || 'esta loja'}"</span>. <br/>
              Esta ação será registrada nos logs de auditoria.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-8 bg-background">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Tipo de Licença</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-14 font-bold border-muted-foreground/20 focus:ring-primary/20">
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLAN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="font-bold">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="font-bold" />
                </FormItem>
              )}
            />
            
            {form.watch('plan') !== 'trial' && (
              <FormField
                control={form.control}
                name="durationMonths"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Duração do Acesso (Meses)</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-14 font-black text-lg border-muted-foreground/20 focus:ring-primary/20" {...field} />
                    </FormControl>
                    <FormMessage className="font-bold" />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="flex-col sm:flex-row gap-4 pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                className="flex-1 h-12 font-black uppercase text-[11px] tracking-widest"
                onClick={() => onOpenChange(false)} 
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-12 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Confirmar Concessão'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
