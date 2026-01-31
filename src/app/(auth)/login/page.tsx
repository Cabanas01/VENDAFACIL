'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setErrorMsg(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
        setLoading(false);
      } else {
        // Sucesso: Redirecionamento é feito automaticamente pelo layout do Next.js após a mudança de cookies
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setErrorMsg('Erro inesperado ao entrar.');
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl border-border/50">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto">
          <Avatar className="h-16 w-16 rounded-xl">
            <AvatarImage src="/logo.png" alt="VendaFacil" />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">VF</AvatarFallback>
          </Avatar>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-3xl font-headline font-bold">VendaFácil</CardTitle>
          <CardDescription>Gerencie suas vendas com inteligência.</CardDescription>
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
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
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

            <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Entrar na conta
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 text-sm text-center">
        <p className="text-muted-foreground">
          Ainda não tem conta?{' '}
          <Link href="/signup" className="text-primary hover:underline font-bold">Criar conta</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
