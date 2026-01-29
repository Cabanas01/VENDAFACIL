'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type CallbackType = 'signup' | 'recovery' | 'email_change' | 'magiclink' | 'invite' | string | null;

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const run = async () => {
      const type: CallbackType = searchParams.get('type');
      const nextParam = searchParams.get('next');

      // ✅ Por padrão: fluxo de confirmação deve terminar no /login (nunca /dashboard)
      const next =
        (nextParam && nextParam.startsWith('/') ? nextParam : null) ??
        (type === 'recovery' ? '/auth/update-password' : '/login');

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

        // ✅ Requisito do fluxo: signup confirm -> login (não pode cair no app logado)
        if (type === 'signup') {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        router.replace(next);
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Falha na autenticação',
          description: err?.message || 'Não foi possível validar o link.',
        });
        router.replace('/login');
      } finally {
        setBusy(false);
      }
    };

    run();
  }, [router, searchParams, toast]);

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle>Validando link...</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-10">
        {busy && <Loader2 className="h-6 w-6 animate-spin" />}
      </CardContent>
    </Card>
  );
}
