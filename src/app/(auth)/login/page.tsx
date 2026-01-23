'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
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

export default function LoginPage() {
  const { login, signup, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthModeWithConfirm>('login');

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
  
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    const { error } = await login(values.email, values.password);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro no login',
        description: error.message || 'Email ou senha inválidos.',
      });
    } else {
      toast({
        title: 'Login realizado!',
        description: 'Redirecionando...',
      });
      // The onAuthStateChange listener in AuthProvider and the useEffect will handle the redirect
    }
    setLoading(false);
  };

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    const { error } = await signup(values.email, values.password);
    setLoading(false);

    if (error) {
       signupForm.setError('email', {
        type: 'manual',
        message: error.message || 'Ocorreu um erro ao criar a conta.',
      });
    } else {
      signupForm.reset();
      setMode('confirm_email');
    }
  };
  
  const handleReconfirmation = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
        title: "Funcionalidade não implementada",
        description: "Esta é uma ação simulada.",
    });
    setLoading(false);
  }

  const handleReset = async (values: z.infer<typeof resetSchema>) => {
    setLoading(true);
    // In a real app, you'd call Supabase's reset password function
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: 'Link enviado (simulado)',
      description: 'Enviamos um link para seu email se ele existir em nossa base.',
    });
    setLoading(false);
    resetForm.reset();
  };

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
              confirm_email: 'Quase lá! Se a confirmação estiver ativa, enviamos um e-mail para você.'
            }[mode]
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === 'confirm_email' ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta. Se não o encontrar, verifique sua pasta de spam. Após confirmar, você poderá fazer o login.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setMode('login')}>
                Ir para o Login
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="login" className="w-full" value={mode} onValueChange={(val) => setMode(val as AuthMode)}>
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
                          <Input placeholder="seu@email.com" {...field} />
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
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
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
                          <Input placeholder="seu@email.com" {...field} />
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
                          <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
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
                          <Input placeholder="seu@email.com" {...field} />
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
          <Button variant="link" size="sm" onClick={() => setMode('reset')}>
            Esqueceu sua senha?
          </Button>
        )}
        {mode === 'reset' && (
           <Button variant="link" size="sm" onClick={() => setMode('login')}>
            Voltar para o login
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
