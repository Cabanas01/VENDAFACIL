'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { StoreRow } from './stores';

const PLAN_OPTIONS = [
  { label: 'Mensal', value: 'mensal' },
  { label: 'Anual', value: 'anual' },
] as const;

// Zod schema now uses the exact lowercase values required by the database check constraint.
const grantPlanSchema = z.object({
  plan: z.enum(['mensal', 'anual'], { required_error: 'Selecione um plano.' }),
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

    // The payload now matches the exact format and values required by the API and RPC.
    const payload = {
      storeId: store.id,
      planoTipo: values.plan, // Sends 'mensal' or 'anual'
      duracaoDias: Number(values.durationMonths) * 30, // Simplified conversion
      origem: 'manual_admin',
      renovavel: true
    };
    console.log('[grant-plan] Sending payload:', payload);

    try {
      const response = await fetch('/api/admin/grant-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Improved error handling to display the detailed message from the API.
        throw new Error(result.message || result.error || `Erro desconhecido (${response.status})`);
      }

      toast({
        title: 'Plano concedido com sucesso!',
        description: `A loja "${store.name}" agora tem o plano ${values.plan} por ${values.durationMonths} meses.`,
      });
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao conceder plano',
        // This will now display the specific error from the backend (e.g., 'not admin').
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!store) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conceder Plano para "{store.name}"</DialogTitle>
          <DialogDescription>
            Esta ação concederá um plano pago manualmente, sem gerar cobrança.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Plano</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de plano" />
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
            <FormField
              control={form.control}
              name="durationMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (em meses)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conceder Plano
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
