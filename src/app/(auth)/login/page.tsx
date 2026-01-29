'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { login, signup } from '../actions';
import { useAuth } from '@/components/auth-provider';

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(1, { message: 'Senha é obrigatória.' }),
});

const signupSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres.' }),
});

const resetSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
});

type AuthMode = 'login' | 'signup' | 'reset';
type AuthModeWithConfirm = AuthMode | 'confirm_email';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: any;
  const timeout = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthModeWithConfirm>('login');
  const [lastSignupEmail, setLastSignupEmail] = useState<string>('');

  useEffect(() => {
    // Se o usuário já está logado, redireciona para o dashboard.
    // Isso impede que um usuário autenticado veja a página de login.
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);


  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '' },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);

    const result = await login(formData);
    setLoading(false);

    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: result.error.message,
      });
    } else if (result?.success) {
      // Redireciona explicitamente para o dashboard.
      // O AppLayout e o AuthProvider vão garantir que o estado seja carregado corretamente.
      router.replace('/dashboard');
    }
  };

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);

    try {
        const result = await signup(formData);

        if (result?.error) {
            signupForm.setError('email', {
                type: 'manual',
                message: result.error.message,
            });
            return;
        }

        setLastSignupEmail(values.email);
        signupForm.reset();
        setMode('confirm_email');
    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Erro inesperado',
            description: e?.message || 'Falha ao criar conta.',
        });
        console.error('[SIGNUP] error', e);
    } finally {
        setLoading(false);
    }
  };

  const handleReconfirmation = async () => {
    if (!supabase) {
      toast({
        variant: 'destructive',
        title: 'Supabase não configurado',
        description: 'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      });
      return;
    }

    const email = lastSignupEmail;
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email não disponível',
        description: 'Crie a conta novamente para reenviar a confirmação.',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await withTimeout(supabase.auth.resend({ type: 'signup', email }), 15000);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Não foi possível reenviar',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Confirmação reenviada',
        description: 'Verifique sua caixa de entrada e spam.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: e?.message || 'Falha ao reenviar confirmação.',
      });
      console.error('[CONFIRM] error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (values: z.infer<typeof resetSchema>) => {
    if (!supabase) {
      toast({
        variant: 'destructive',
        title: 'Supabase não configurado',
        description: 'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      });
      return;
    }

    setLoading(true);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: siteUrl ? `${siteUrl}/auth/update-password` : undefined,
        }),
        15000
      );

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao enviar link',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Se esse email existir, enviamos um link',
        description: 'Verifique sua caixa de entrada e spam.',
      });

      resetForm.reset();
      setMode('login');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: e?.message || 'Falha ao enviar link.',
      });
      console.error('[RESET] error', e);
    } finally {
      setLoading(false);
    }
  };
  
  if (authLoading) {
    return (
       <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Avatar className="h-16 w-16 rounded-lg">
            <AvatarImage src="/logo.png" alt="VendaFacil Logo" />
            <AvatarFallback>VF</AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-3xl font-headline">VendaFácil</CardTitle>
        <CardDescription>
          {
            {
              login: 'Acesse sua conta para gerenciar suas vendas.',
              signup: 'Crie sua conta para começar a vender.',
              reset: 'Recupere seu acesso com um novo link.',
              confirm_email:
                'Quase lá! Se a confirmação estiver ativa, enviamos um e-mail para você.',
            }[mode]
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {mode === 'confirm_email' ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada e clique no link para ativar sua conta. Se não encontrar,
              veja o spam. Após confirmar, você poderá fazer o login.
            </p>

            <Button className="w-full" onClick={handleReconfirmation} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reenviar confirmação
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMode('login')}
              disabled={loading}
            >
              Ir para o Login
            </Button>
          </div>
        ) : (
          <Tabs
            defaultValue="login"
            className="w-full"
            value={mode}
            onValueChange={(val) => setMode(val as AuthMode)}
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Sua senha"
                              autoComplete="current-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <p className="text-xs text-center text-muted-foreground">
                    Ao criar, você concorda com nossos Termos de Serviço.
                  </p>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="reset">
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar link de recuperação
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-center justify-center text-sm">
        {mode === 'login' && (
          <Button variant="link" size="sm" onClick={() => setMode('reset')} disabled={loading}>
            Esqueceu sua senha?
          </Button>
        )}
        {mode === 'reset' && (
          <Button variant="link" size="sm" onClick={() => setMode('login')} disabled={loading}>
            Voltar para o login
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
