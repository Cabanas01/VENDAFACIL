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
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthModeWithConfirm>('login');
  const [lastSignupEmail, setLastSignupEmail] = useState<string>('');

  // Reactive Navigation: Let the AuthProvider update the state and then redirect
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const next = searchParams.get('next') || '/dashboard';
      router.replace(next);
    }
  }, [isAuthenticated, authLoading, router, searchParams]);

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
    
    if (result?.error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: result.error.message,
      });
    }
    // Success is handled by the useEffect watching isAuthenticated
  };

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);

    try {
        const result = await signup(formData);
        if (result?.error) {
            signupForm.setError('email', { type: 'manual', message: result.error.message });
            return;
        }
        setLastSignupEmail(values.email);
        signupForm.reset();
        setMode('confirm_email');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro inesperado', description: e.message });
    } finally {
        setLoading(false);
    }
  };

  const handleReset = async (values: z.infer<typeof resetSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      toast({ title: 'Link enviado', description: 'Verifique seu e-mail.' });
      setMode('login');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setLoading(false);
    }
  };
  
  if (authLoading) {
    return (
       <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
    );
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
              confirm_email: 'Verifique seu e-mail para ativar sua conta.',
            }[mode]
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {mode === 'confirm_email' ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmação. Após confirmar, você poderá fazer o login.
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
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input placeholder="seu@email.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? 'text' : 'password'} placeholder="Sua senha" {...field} />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
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
                  <FormField control={signupForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input placeholder="seu@email.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
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
                  <FormField control={resetForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input placeholder="seu@email.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Recuperar Senha
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
        {(mode === 'reset' || mode === 'confirm_email') && (
          <Button variant="link" size="sm" onClick={() => setMode('login')}>
            Voltar para o login
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
