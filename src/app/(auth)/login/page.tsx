'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

/**
 * LoginPage (Componente Burro)
 * Apenas executa a ação de login. 
 * A navegação é decidida pelo AppLayout reativamente assim que o AuthProvider atualiza o estado.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        // Sucesso: O AppLayout detectará o novo estado de 'user' e redirecionará.
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        setError("Verifique seu e-mail para confirmar o cadastro.");
      }
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

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
        <Tabs value={mode} onValueChange={(val) => setMode(val as 'login' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                placeholder="seu@email.com" 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input 
                  id="password"
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
            </div>

            {error && (
              <p className={`text-sm font-medium p-2 rounded ${error.includes('Verifique') ? 'bg-blue-50 text-blue-600' : 'bg-destructive/10 text-destructive'}`}>
                {error}
              </p>
            )}

            <Button type="submit" className="w-full font-bold py-6 text-lg" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : mode === 'login' ? 'Acessar Sistema' : 'Criar Minha Conta'}
            </Button>
          </form>
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
