'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { isValidCnpj } from '@/lib/utils';

const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const companySchema = z.object({
  cnpj: z.string().refine(isValidCnpj, { message: 'CNPJ inválido.' }),
  legal_name: z.string().min(1, { message: 'Razão Social é obrigatória.' }),
  name: z.string().min(1, { message: 'Nome Fantasia é obrigatório.' }),
  isMei: z.boolean().default(false),
  stateRegistration: z.string().optional(),
  municipalRegistration: z.string().optional(),
});

const addressSchema = z.object({
  cep: z.string().length(9, { message: 'CEP deve ter 8 dígitos.' }),
  street: z.string().min(1, { message: 'Rua é obrigatória.' }),
  number: z.string().min(1, { message: 'Número é obrigatório.' }),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, { message: 'Bairro é obrigatório.' }),
  city: z.string().min(1, { message: 'Cidade é obrigatória.' }),
  state: z.string().min(2, { message: 'Estado é obrigatório.' }),
});

const preferencesSchema = z.object({
  phone: z.string().optional(),
  timezone: z.string().default('America/Sao_Paulo'),
  businessType: z.string().optional(),
});

const onboardingSchema = companySchema.merge(addressSchema).merge(preferencesSchema);

type OnboardingValues = z.infer<typeof onboardingSchema>;

const steps = [
  { id: 'empresa', title: 'Identificação da Empresa', fields: ['cnpj', 'legal_name', 'name', 'isMei', 'stateRegistration', 'municipalRegistration'] as const, schema: companySchema },
  { id: 'endereco', title: 'Endereço Comercial', fields: ['cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'] as const, schema: addressSchema },
  { id: 'preferencias', title: 'Contato e Preferências', fields: ['phone', 'timezone', 'businessType'] as const, schema: preferencesSchema },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { createStore, storeError } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      isMei: false,
      timezone: 'America/Sao_Paulo',
      stateRegistration: '',
      municipalRegistration: '',
      complement: '',
      phone: '',
      businessType: '',
      cnpj: '',
      legal_name: '',
      name: '',
      cep: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
    },
  });

  const { trigger } = form;

  const nextStep = async () => {
    const isValid = await trigger(steps[currentStep].fields);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };
  
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let cep = e.target.value.replace(/\D/g, '');
    if (cep.length > 5) {
      cep = cep.slice(0, 5) + '-' + cep.slice(5, 8);
    }
    form.setValue('cep', cep);

    if (cep.replace('-', '').length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep.replace('-', '')}/json/`);
        const data = await response.json();
        if (!data.erro) {
          form.setValue('street', data.logradouro, { shouldValidate: true });
          form.setValue('neighborhood', data.bairro, { shouldValidate: true });
          form.setValue('city', data.localidade, { shouldValidate: true });
          form.setValue('state', data.uf, { shouldValidate: true });
        }
      } catch (error) {
        console.error("Failed to fetch CEP:", error);
      }
    }
  }

  const handleCnpjChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.slice(0, 14);
    
    // Apply mask
    let maskedValue = value;
    maskedValue = maskedValue.replace(/^(\d{2})(\d)/, '$1.$2');
    maskedValue = maskedValue.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    maskedValue = maskedValue.replace(/\.(\d{3})(\d)/, '.$1/$2');
    maskedValue = maskedValue.replace(/(\d{4})(\d)/, '$1-$2');
    form.setValue('cnpj', maskedValue);

    // Fetch data if CNPJ is complete
    if (value.length === 14 && isValidCnpj(maskedValue)) {
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${value}`);
        if(response.ok) {
            const data = await response.json();
            form.setValue('legal_name', data.razao_social, { shouldValidate: true });
            form.setValue('name', data.nome_fantasia || data.razao_social, { shouldValidate: true });
            form.setValue('cep', data.cep, { shouldValidate: true });
            form.setValue('street', data.logradouro, { shouldValidate: true });
            form.setValue('number', data.numero, { shouldValidate: true });
            form.setValue('neighborhood', data.bairro, { shouldValidate: true });
            form.setValue('city', data.municipio, { shouldValidate: true });
            form.setValue('state', data.uf, { shouldValidate: true });
            form.setValue('phone', data.ddd_telefone_1, { shouldValidate: true });
            toast({ title: 'Dados do CNPJ preenchidos automaticamente!' });
        }
      } catch (error) {
        console.error("Failed to fetch CNPJ data:", error);
      }
    }
  }

  const onSubmit = async (values: OnboardingValues) => {
    setIsSubmitting(true);
    try {
      toast({
        title: 'Criando sua loja...',
        description: 'Aguarde um momento.',
      });

      const storeData = {
        name: values.name,
        cnpj: values.cnpj,
        legal_name: values.legal_name,
        address: {
          cep: values.cep,
          street: values.street,
          number: values.number,
          complement: values.complement,
          neighborhood: values.neighborhood,
          city: values.city,
          state: values.state,
        },
        phone: values.phone,
        timezone: values.timezone,
      };

      const newStore = await createStore(storeData);

      if (!newStore) {
        toast({
          variant: 'destructive',
          title: 'Erro ao criar loja',
          description: storeError || 'Não foi possível criar sua loja. Verifique no Supabase se as funções/policies foram aplicadas.',
        });
      } else {
        toast({
          title: 'Loja criada com sucesso!',
          description: 'Redirecionando para o painel...',
        });
        // Navigation is now handled by the layout component reactively
      }
    } catch (e: any) {
      console.error('[ONBOARDING] create store exception', e);
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: e?.message || 'Falha ao criar loja.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <PageHeader title="Configuração da sua loja" subtitle="Precisamos de algumas informações para começar." />

      <Card className="shadow-lg">
        <CardHeader>
          <Progress value={progress} className="mb-4" />
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>Passo {currentStep + 1} de {steps.length}</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {currentStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="cnpj" render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} onChange={handleCnpjChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="legal_name" render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl><Input placeholder="Padaria X LTDA" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl><Input placeholder="Padaria do João" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stateRegistration" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inscrição Estadual (opcional)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="municipalRegistration" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inscrição Municipal (opcional)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isMei" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sou MEI</FormLabel>
                      </div>
                    </FormItem>
                  )} />
                </div>
              )}

              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                   <FormField control={form.control} name="cep" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>CEP</FormLabel>
                      <FormControl><Input placeholder="00000-000" {...field} onChange={handleCepChange} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="street" render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>Rua/Logradouro</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name="number" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Número</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="complement" render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>Complemento (opcional)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="neighborhood" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Bairro</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Cidade</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Telefone/WhatsApp (opcional)</FormLabel>
                        <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="businessType" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipo de negócio (opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="restaurante_lanchonete">Restaurante/Lanchonete</SelectItem>
                                <SelectItem value="mercearia_mercado">Mercearia/Mercado</SelectItem>
                                <SelectItem value="padaria_confeitaria">Padaria/Confeitaria</SelectItem>
                                <SelectItem value="roupas_acessorios">Loja de Roupas e Acessórios</SelectItem>
                                <SelectItem value="salao_beleza_barbearia">Salão de Beleza/Barbearia</SelectItem>
                                <SelectItem value="farmacia_drogaria">Farmácia/Drogaria</SelectItem>
                                <SelectItem value="pet_shop">Pet Shop</SelectItem>
                                <SelectItem value="oficina_mecanica">Oficina Mecânica</SelectItem>
                                <SelectItem value="construcao_reforma">Material de Construção</SelectItem>
                                <SelectItem value="informatica_eletronicos">Informática e Eletrônicos</SelectItem>
                                <SelectItem value="papelaria_livraria">Papelaria e Livraria</SelectItem>
                                <SelectItem value="servicos_gerais">Prestação de Serviços</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              {currentStep > 0 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Voltar
                </Button>
              )}
              {currentStep < steps.length - 1 && (
                 <Button type="button" onClick={nextStep} className="ml-auto">
                    Avançar
                </Button>
              )}
              {currentStep === steps.length - 1 && (
                <Button type="submit" disabled={isSubmitting} className="ml-auto">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar minha loja
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
