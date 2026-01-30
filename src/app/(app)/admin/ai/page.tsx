'use client';

/**
 * @fileOverview Página de Inteligência Artificial para o Admin do SaaS.
 * 
 * Analisa a saúde global do sistema, erros e faturamento dos tenants.
 */

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AdminAiPage() {
  const [loading, setLoading] = useState(true);
  const [globalData, setGlobalData] = useState<any>(null);

  useEffect(() => {
    const fetchGlobalContext = async () => {
      try {
        const [storesRes, salesRes, logsRes] = await Promise.all([
          supabase.from('stores').select('id, name, business_type, created_at'),
          supabase.from('sales').select('total_cents, created_at'),
          supabase.from('admin_logs').select('*').limit(20).order('created_at', { ascending: false })
        ]);

        setGlobalData({
          total_lojas: storesRes.data?.length,
          categorias: storesRes.data?.reduce((acc: any, s: any) => {
            acc[s.business_type || 'outros'] = (acc[s.business_type || 'outros'] || 0) + 1;
            return acc;
          }, {}),
          faturamento_global: (salesRes.data?.reduce((acc, s) => acc + s.total_cents, 0) || 0) / 100,
          total_vendas: salesRes.data?.length,
          ultimos_logs: logsRes.data
        });
      } catch (err) {
        console.error('Falha ao coletar contexto admin');
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalContext();
  }, []);

  const suggestions = [
    "Qual a saúde financeira global do SaaS?",
    "Quais os logs mais recentes de sistema?",
    "Quais categorias de loja são mais comuns?",
    "Houve alguma anomalia de faturamento hoje?",
    "Resuma o crescimento de novos tenants."
  ];

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparando inteligência administrativa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChatInterface 
        title="IA de Governança SaaS"
        subtitle="Análise profunda de logs, infraestrutura e faturamento global."
        contextData={globalData}
        scope="admin"
        suggestions={suggestions}
      />
    </div>
  );
}
