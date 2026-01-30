'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
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
import { useAuth } from '@/components/auth-provider';
import { login, signup } from '../actions';

const authSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres.' }),
});

type AuthValues = z.infer<typeof authSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm_email'>('login');

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  });

  // Redirecionamento reativo: Se o estado global mudar para autenticado, vamos para a dashboard.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleAuth = async (values: AuthValues) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);

    try {
      const result = mode === 'login' ? await login(formData) : await signup(formData);

      if (result?.error) {
        toast({
          variant: "destructive",
          title: mode === 'login' ? "Erro ao entrar" : "Erro no cadastro",
          description: result.error.message,
        });
      } else if (mode === 'signup' && !result?.error) {
        setMode('confirm_email');
      }
      // 🚨 IMPORTANTE: Se for login, não redirecionamos aqui. O useEffect acima cuidará disso
      // assim que o AuthProvider detectar a nova sessão nos cookies.
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'confirm_email') {
    return (
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-primary/10 p-3 rounded-full w-fit">
            <AlertCircle className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Confirme seu E-mail</CardTitle>
          <CardDescription>
            Enviamos um link de ativação para <strong>{form.getValues('email')}</strong>. 
            Por favor, verifique sua caixa de entrada e spam.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => setMode('login')}>
            Voltar para o Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-primary/10">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Avatar className="h-16 w-16 rounded-lg shadow-sm">
            <AvatarImage src="/logo.png" alt="VendaFacil Logo" />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">VF</AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-3xl font-headline font-bold text-primary">VendaFácil</CardTitle>
        <CardDescription>Ponto de venda inteligente e descomplicado.</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={mode as string} onValueChange={(val) => setMode(val as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="seu@email.com" type="email" autoComplete="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" {...field} />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full font-bold py-6 text-lg" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : mode === 'login' ? 'Acessar Sistema' : 'Criar Minha Conta'}
              </Button>
            </form>
          </Form>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-center border-t bg-muted/30 pt-4">
        <Button variant="link" size="sm" className="text-muted-foreground hover:text-primary">
          Esqueceu sua senha?
        </Button>
      </CardFooter>
    </Card>
  );
}
