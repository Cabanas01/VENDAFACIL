'use client';

/**
 * @fileOverview Componente de IA (Client Controller)
 * 
 * Gerencia o estado de prontidão e a montagem do snapshot de dados.
 */

import { useAuth } from '@/components/auth-provider';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Database, AlertCircle, Loader2 } from 'lucide-react';

export default function StoreAiContent() {
  const { products, sales, store, accessStatus } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const hasSales = (sales || []).length > 0;
  const hasProducts = (products || []).length > 0;
  const canAnalyze = hasSales && hasProducts;

  const dataSnapshot = useMemo(() => {
    if (!canAnalyze || !ready) return null;

    return {
      loja: {
        nome: store?.name,
        plano: accessStatus?.plano_nome,
        expira: accessStatus?.data_fim_acesso,
      },
      estoque: (products || []).slice(0, 50).map(p => ({
        nome: p.name,
        preco: (p.price_cents || 0) / 100,
        custo: (p.cost_cents || 0) / 100,
        qtd: p.stock_qty
      })),
      vendas: (sales || []).slice(0, 20).map(s => ({
        data: s.created_at,
        total: (s.total_cents || 0) / 100,
        metodo: s.payment_method
      }))
    };
  }, [canAnalyze, ready, products, sales, store, accessStatus]);

  const suggestions = [
    "Faça um resumo do meu faturamento atual.",
    "Quais produtos têm a melhor margem de lucro?",
    "Quais são os riscos no meu estoque?",
    "Como posso aumentar meu lucro este mês?"
  ];

  if (!ready) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
      </div>
    );
  }

  if (!canAnalyze) {
    return (
      <Card className="border-dashed py-24 bg-muted/5 flex flex-col items-center justify-center text-center">
        <CardContent className="space-y-6">
          <div className="p-5 bg-background rounded-full border shadow-sm w-fit mx-auto ring-8 ring-primary/5">
            <Database className="h-10 w-10 text-primary/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tight font-headline">Inteligência Desativada</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
              Ainda não há dados suficientes para gerar uma análise estratégica. <br/>
              <span className="font-black text-foreground">Registre pelo menos 1 produto e 1 venda</span> para liberar o seu assistente de negócios.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
            <AlertCircle className="h-3 w-3" />
            Aguardando dados operacionais
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatInterface 
      title="Consultor Estratégico"
      subtitle="Insights reais baseados nos seus dados operacionais."
      contextData={dataSnapshot}
      scope="store"
      suggestions={suggestions}
    />
  );
}
