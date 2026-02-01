'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { StoreRow } from './stores';
import { grantPlanAction } from '@/app/actions/admin-actions';

const PLAN_OPTIONS = [
  { label: 'Avaliação (7 dias)', value: 'free' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
] as const;

const grantPlanSchema = z.object({
  plan: z.enum(['free', 'weekly', 'monthly', 'yearly'], { required_error: 'Selecione um plano.' }),
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
      plan: 'monthly',
      durationMonths: 1,
    },
  });

  const onSubmit = async (values: GrantPlanFormValues) => {
    if (!store) return;
    setIsSubmitting(true);

    const calculatedDays = values.plan === 'free' ? 7 : Number(values.durationMonths) * 30;

    try {
      const result = await grantPlanAction({
        storeId: store.id,
        planoTipo: values.plan,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Conceder Acesso Manual</DialogTitle>
          <DialogDescription className="text-center">
            Ajuste a licença da loja <span className="font-bold text-foreground">"{store.name || 'esta loja'}"</span>. 
            Esta ação será registrada nos logs de auditoria.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Tipo de Licença</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLAN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch('plan') !== 'free' && (
              <FormField
                control={form.control}
                name="durationMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Duração do Acesso (Meses)</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                className="flex-1 h-11"
                onClick={() => onOpenChange(false)} 
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-11 font-bold" disabled={isSubmitting}>
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
