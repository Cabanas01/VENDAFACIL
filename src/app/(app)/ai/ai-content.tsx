'use client';

/**
 * @fileOverview Componente de IA (PRE-FLIGHT VALIDATION)
 * 
 * Bloqueia chamadas se não houver dados operacionais mínimos (produtos/vendas).
 */

import { useAuth } from '@/components/auth-provider';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Database } from 'lucide-react';

export default function StoreAiContent({ isAiConfigured }: { isAiConfigured: boolean }) {
  const { store, products, sales, customers, accessStatus } = useAuth();

  const hasSales = (sales || []).length > 0;
  const hasProducts = (products || []).length > 0;
  const hasData = hasSales && hasProducts;

  const dataSnapshot = useMemo(() => {
    if (!isAiConfigured || !hasData) return null;

    const limitedProducts = (products || []).slice(0, 50).map(p => ({
      nome: p.name,
      categoria: p.category,
      preco: (p.price_cents || 0) / 100,
      custo: (p.cost_cents || 0) / 100,
      qtd: p.stock_qty
    }));

    const limitedSales = (sales || []).slice(0, 20).map(s => ({
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
            <h3 className="text-lg font-black uppercase tracking-tight">Dados Insuficientes</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto font-medium">
              Ainda não há dados suficientes para gerar uma análise inteligente. <br/>
              Registre vendas e produtos para liberar seu consultor estratégico.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatInterface 
      title="Consultor Estratégico"
      subtitle="Insights baseados na sua operação real."
      contextData={dataSnapshot}
      scope="store"
      suggestions={suggestions}
      isAiConfigured={isAiConfigured}
    />
  );
}
