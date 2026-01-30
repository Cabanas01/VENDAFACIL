
'use client';

/**
 * @fileOverview OnboardingPage (Dumb Form)
 * 
 * Coleta os dados comerciais para a criação da primeira loja.
 * NÃO executa redirecionamentos após o sucesso. Confia no AppLayout (Guardião Único).
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Store, MapPin, Phone, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { isValidCnpj } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const onboardingSchema = z.object({
  name: z.string().min(3, 'O nome fantasia deve ter pelo menos 3 caracteres'),
  legal_name: z.string().min(3, 'A razão social deve ter pelo menos 3 caracteres'),
  cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  timezone: z.string().default('America/Sao_Paulo'),
  cep: z.string().length(9, 'CEP inválido'),
  street: z.string().min(1, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Estado inválido'),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const { createStore } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      timezone: 'America/Sao_Paulo',
      state: 'SP'
    },
  });

  const onSubmit = async (values: OnboardingValues) => {
    setIsSubmitting(true);
    try {
      await createStore({
        name: values.name,
        legal_name: values.legal_name,
        cnpj: values.cnpj,
        phone: values.phone,
        timezone: values.timezone,
        address: {
          cep: values.cep,
          street: values.street,
          number: values.number,
          neighborhood: values.neighborhood,
          city: values.city,
          state: values.state
        }
      });
      // Sucesso: O AppLayout detectará 'has_store' e levará ao Dashboard automaticamente.
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar loja',
        description: error.message || 'Verifique os dados e tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5, 8);
    form.setValue('cep', val);

    if (val.replace('-', '').length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${val.replace('-', '')}/json/`);
        const data = await res.json();
        if (!data.erro) {
          form.setValue('street', data.logradouro);
          form.setValue('neighborhood', data.bairro);
          form.setValue('city', data.localidade);
          form.setValue('state', data.uf);
        }
      } catch (err) {
        console.error('Falha ao buscar CEP');
      }
    }
  };

  return (
    <Card className="shadow-2xl border-border/50">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-headline font-bold">Configuração da Loja</CardTitle>
            <CardDescription>Precisamos de alguns dados para ativar seu painel.</CardDescription>
          </div>
          <Store className="h-8 w-8 text-primary" />
        </div>
        <Progress value={step === 1 ? 50 : 100} className="h-2" />
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                  <Store className="h-4 w-4" /> Dados Comerciais
                </div>
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl><Input placeholder="Ex: Padaria do João" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="legal_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social</FormLabel>
                        <FormControl><Input placeholder="Ex: João Silva Alimentos LTDA" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuso Horário</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                              <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                  <MapPin className="h-4 w-4" /> Localização
                </div>
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl><Input placeholder="00000-000" {...field} onChange={handleCepChange} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rua</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nº</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UF</FormLabel>
                            <FormControl><Input {...field} maxLength={2} className="uppercase" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6 bg-muted/20">
            {step === 2 && (
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>
                Voltar
              </Button>
            )}
            
            {step === 1 ? (
              <Button 
                type="button" 
                className="ml-auto group" 
                onClick={() => setStep(2)}
              >
                Próximo passo
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                className="ml-auto" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  'Concluir Onboarding'
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
