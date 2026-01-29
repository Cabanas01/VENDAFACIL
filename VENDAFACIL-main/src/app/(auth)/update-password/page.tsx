'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const schema = z.object({
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres.' }),
});

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [initializing, setInitializing] = useState(true);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!supabase) {
        toast({
          variant: 'destructive',
          title: 'Supabase não configurado',
          description: 'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        });
        router.replace('/login');
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Link inválido/expirado',
          description: err?.message || 'Peça um novo link de recuperação.',
        });
        router.replace('/login');
        return;
      } finally {
        setInitializing(false);
      }
    };

    run();
  }, [router, searchParams, toast]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!supabase) return;

    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar senha',
        description: error.message,
      });
      return;
    }

    toast({ title: 'Senha atualizada!', description: 'Você já pode usar sua nova senha.' });
    router.replace('/dashboard');
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle>Definir nova senha</CardTitle>
        <CardDescription>Escolha uma senha nova para sua conta.</CardDescription>
      </CardHeader>

      <CardContent>
        {initializing ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar senha
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
