// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const run = async () => {
      const next = searchParams.get('next') || '/dashboard';
      const code = searchParams.get('code');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!supabase) {
        toast({
          variant: 'destructive',
          title: 'Supabase não configurado',
          description: 'Faltam variáveis NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.',
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
  }, [router, searchParams, supabase, toast]);

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
