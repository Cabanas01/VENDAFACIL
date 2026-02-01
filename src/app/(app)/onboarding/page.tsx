
'use client';

/**
 * @fileOverview OnboardingPage (Dumb Form)
 * 
 * Esta página é focada APENAS na coleta dos dados da nova loja.
 * O controle de quem pode ver esta página é feito pelo AppLayout (Server Component) de forma síncrona.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Store, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { isValidCnpj } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';

const onboardingSchema = z.object({
  name: z.string().min(3, 'Nome fantasia muito curto'),
  legal_name: z.string().min(3, 'Razão social muito curta'),
  cnpj: z.string().refine((val) => isValidCnpj(val), 'CNPJ inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  timezone: z.string().default('America/Sao_Paulo'),
  cep: z.string().length(9, 'CEP inválido'),
  street: z.string().min(1, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  neighborhood: z.string().min(1, 'Bairro obrigatório'),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().length(2, 'UF inválida'),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const { createStore } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { 
      name: '',
      legal_name: '',
      cnpj: '',
      phone: '',
      timezone: 'America/Sao_Paulo', 
      cep: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '' 
    },
  });

  const { setValue, watch, trigger } = form;
  const cleanCnpj = (watch('cnpj') || '').replace(/\D/g, '');

  // Autofill via BrasilAPI
  useEffect(() => {
    if (cleanCnpj.length !== 14) return;

    const fetchCnpjData = async () => {
      setIsLoadingCnpj(true);
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (!response.ok) throw new Error('CNPJ não encontrado');
        
        const data = await response.json();
        setValue('legal_name', data.razao_social || '');
        setValue('name', data.nome_fantasia || data.razao_social || '');
        setValue('phone', data.ddd_telefone_1 || '');
        setValue('cep', data.cep || '');
        setValue('street', data.logradouro || '');
        setValue('neighborhood', data.bairro || '');
        setValue('city', data.municipio || '');
        setValue('state', data.uf || '');
        setValue('number', data.numero || '');

        toast({ title: 'Dados localizados!', description: 'Campos preenchidos automaticamente.' });
      } catch (err) {
        console.warn('CNPJ Autofill Error', err);
      } finally {
        setIsLoadingCnpj(false);
      }
    };

    fetchCnpjData();
  }, [cleanCnpj, setValue, toast]);

  const onSubmit = async (values: OnboardingValues) => {
    setIsSubmitting(true);
    try {
      await createStore(values);
      toast({ title: 'Loja Ativada!', description: 'Bem-vindo ao VendaFácil.' });
    } catch (error: any) {
      console.error('[ONBOARDING_ERROR]', error);
      
      let errorMessage = error.message || 'Falha ao criar loja.';
      
      // Tradução de erros comuns do Supabase/Postgres
      if (errorMessage.includes('stores_user_id_fkey')) {
        errorMessage = 'Erro de sincronização: Seu perfil de usuário ainda não foi criado no banco de dados. Tente novamente em instantes.';
      }

      toast({
        variant: 'destructive',
        title: 'Erro no Cadastro',
        description: errorMessage
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-10">
      <Card className="shadow-2xl border-border/50">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-xl w-fit">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-headline font-bold">Configuração da Loja</CardTitle>
            <CardDescription>Precisamos de alguns dados para ativar seu PDV.</CardDescription>
          </div>
          <Progress value={step === 1 ? 50 : 100} className="h-1.5" />
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {step === 1 ? (
                <div className="space-y-4">
                  <FormField control={form.control} name="cnpj" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ (Somente números)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="00000000000000" {...field} />
                          {isLoadingCnpj && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="legal_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <FormField control={form.control} name="cep" render={({ field }) => (
                        <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 0000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <FormField control={form.control} name="street" render={({ field }) => (
                        <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="col-span-1">
                      <FormField control={form.control} name="number" render={({ field }) => (
                        <FormItem><FormLabel>Nº</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                  <FormField control={form.control} name="neighborhood" render={({ field }) => (
                    <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="col-span-1">
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem><FormLabel>UF</FormLabel><FormControl><Input {...field} maxLength={2} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-6 bg-muted/20">
              {step === 2 && (
                <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>Voltar</Button>
              )}
              {step === 1 ? (
                <Button type="button" className="ml-auto" onClick={async () => {
                  const isValid = await trigger(['cnpj', 'name', 'legal_name']);
                  if (isValid) setStep(2);
                }}>Próximo <ArrowRight className="ml-2 h-4 w-4" /></Button>
              ) : (
                <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Minha Loja'}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
