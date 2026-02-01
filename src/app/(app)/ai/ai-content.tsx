'use client';

/**
 * @fileOverview Componente de IA
 * 
 * Implementa validação de dados antes do envio para evitar análises sobre bases vazias.
 */

import { useAuth } from '@/components/auth-provider';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Database } from 'lucide-react';

export default function StoreAiContent({ isAiConfigured }: { isAiConfigured: boolean }) {
  const { store, products, sales, customers, accessStatus } = useAuth();

  const hasData = products.length > 0 || sales.length > 0;

  const dataSnapshot = useMemo(() => {
    if (!isAiConfigured || !hasData) return null;

    const limitedProducts = products.slice(0, 50).map(p => ({
      nome: p.name,
      categoria: p.category,
      preco: (p.price_cents || 0) / 100,
      custo: (p.cost_cents || 0) / 100,
      qtd: p.stock_qty
    }));

    const limitedSales = sales.slice(0, 20).map(s => ({
      data: s.created_at,
      total: (s.total_cents || 0) / 100,
      metodo: s.payment_method
    }));

    return {
      loja: {
        nome: store?.name,
        plano: accessStatus?.plano_nome,
        expira: accessStatus?.data_fim_acesso,
      },
      estoque: limitedProducts,
      vendas: limitedSales,
      clientes: (customers || []).length
    };
  }, [store, products, sales, customers, accessStatus, isAiConfigured, hasData]);

  const suggestions = [
    "Resuma meu desempenho financeiro.",
    "Quais produtos têm a melhor margem?",
    "Identifique riscos no meu estoque atual.",
    "Como aumentar meu ticket médio?"
  ];

  if (!hasData && isAiConfigured) {
    return (
      <Card className="border-dashed py-24 bg-muted/5 flex flex-col items-center justify-center text-center">
        <CardContent className="space-y-4">
          <div className="p-4 bg-background rounded-full border shadow-sm w-fit mx-auto">
            <Database className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black uppercase tracking-tight">Dados insuficientes</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Ainda não há dados suficientes (produtos ou vendas) para gerar uma análise inteligente. Comece a operar para liberar os insights da IA.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatInterface 
      title="Consultor Estratégico"
      subtitle="Insights automáticos baseados na sua operação real."
      contextData={dataSnapshot}
      scope="store"
      suggestions={suggestions}
      isAiConfigured={isAiConfigured}
    />
  );
}
