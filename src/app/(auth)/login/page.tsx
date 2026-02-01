'use client';

/**
 * @fileOverview Página de Login Otimizada para SEO e AdSense.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import Script from 'next/script';
import { trackEvent } from '@/lib/analytics/track';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('login_view');
  }, []);

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
        trackEvent('login_success', { email: values.email });
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setErrorMsg('Erro inesperado ao entrar.');
      setLoading(false);
    }
  };

  return (
    <article className="w-full">
      {/* Script AdSense obrigatório para verificação na página de entrada */}
      <Script
        id="adsense-login-direct"
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7101977987227464"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      
      <Card className="shadow-2xl border-border/50 overflow-hidden">
        <CardHeader className="text-center space-y-4 pt-10">
          <div className="mx-auto bg-primary/5 p-4 rounded-full w-fit">
            <Avatar className="h-16 w-16 rounded-xl shadow-lg border-2 border-background">
              <AvatarImage src="/logo.png" alt="VendaFacil Brasil" />
              <AvatarFallback className="bg-primary text-primary-foreground font-black text-xl">VF</AvatarFallback>
            </Avatar>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-headline font-black tracking-tighter text-foreground uppercase">
              Acesse seu PDV Online
            </h1>
            <CardDescription className="text-sm font-medium px-6">
              O sistema de vendas simples e rápido para o seu pequeno negócio.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">E-mail Corporativo</FormLabel>
                    <FormControl>
                      <Input placeholder="exemplo@venda.com" className="h-12" {...field} />
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
                    <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Senha de Acesso</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? 'text' : 'password'} className="h-12 pr-12" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-primary transition-colors"
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
                <div className="p-4 text-xs font-bold bg-destructive/5 border border-destructive/20 text-destructive rounded-xl animate-in fade-in zoom-in-95">
                  {errorMsg}
                </div>
              )}

              <Button type="submit" className="w-full h-14 font-black uppercase tracking-widest shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                Entrar no Sistema
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 py-8 bg-muted/20 border-t">
          <p className="text-xs text-muted-foreground font-medium">
            Novo por aqui?{' '}
            <Link href="/signup" className="text-primary hover:underline font-black uppercase tracking-tight">Criar minha conta grátis</Link>
          </p>
        </CardFooter>
      </Card>

      {/* Texto de suporte para SEO Crawlers (H2 oculto visualmente mas visível para robôs) */}
      <section className="sr-only">
        <h2>Por que escolher o VendaFácil Brasil?</h2>
        <p>
          Nosso PDV online simples foi desenhado para quem não quer perder tempo. 
          Diferente de outros softwares, o VendaFácil é focado em pequenos negócios, 
          permitindo controle de estoque, fluxo de caixa e gestão de clientes direto no navegador.
        </p>
      </section>
    </article>
  );
}
