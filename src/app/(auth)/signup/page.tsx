'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics/track';

const signupSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('signup_view');
  }, []);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        trackEvent('signup_success', { email: values.email });
        setSuccess(true);
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro inesperado ao criar sua conta.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="shadow-2xl border-border/50 text-center py-8">
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Verifique seu e-mail</h2>
            <p className="text-muted-foreground">
              Enviamos um link de confirmação para o seu e-mail. Por favor, ative sua conta para começar.
            </p>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Ir para o Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl border-border/50">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto">
          <Avatar className="h-16 w-16 rounded-xl">
            <AvatarImage src="/logo.png" alt="VendaFacil Logo" />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">VF</AvatarFallback>
          </Avatar>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-3xl font-headline font-bold">Criar conta</CardTitle>
          <CardDescription>Comece agora e transforme a gestão do seu negócio.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMsg && (
              <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
                {errorMsg}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Criar minha conta
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="w-full text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Entrar agora
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
