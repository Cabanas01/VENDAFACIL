'use client';

/**
 * @fileOverview Componente de IA
 * 
 * Sincronizado com dados reais e mensagens amigáveis para estados vazios.
 */

import { useAuth } from '@/components/auth-provider';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useMemo } from 'react';

export default function StoreAiContent({ isAiConfigured }: { isAiConfigured: boolean }) {
  const { store, products, sales, customers, accessStatus } = useAuth();

  const dataSnapshot = useMemo(() => {
    if (!isAiConfigured) return null;

    // Proteção: se não houver dados, não envia snapshot vazio que gere análise errada
    if (products.length === 0 && sales.length === 0) return null;

    const limitedProducts = products.slice(0, 50).map(p => ({
      nome: p.name,
      categoria: p.category,
      preco: (p.price_cents || 0) / 100,
      custo: (p.cost_cents || 0) / 100,
      qtd: p.stock_qty,
      min: p.min_stock_qty
    }));

    const limitedSales = sales.slice(0, 20).map(s => ({
      data: s.created_at,
      total: (s.total_cents || 0) / 100,
      metodo: s.payment_method,
      itens: s.items?.length
    }));

    return {
      loja: {
        nome: store?.name,
        plano: accessStatus?.plano_nome,
        expira: accessStatus?.data_fim_acesso,
      },
      estoque: limitedProducts,
      vendas: limitedSales,
      total_clientes: (customers || []).length
    };
  }, [store, products, sales, customers, accessStatus, isAiConfigured]);

  const suggestions = [
    "Qual minha margem de lucro média?",
    "Quais produtos estão acabando?",
    "Resuma meu faturamento desta semana.",
    "Sugira formas de melhorar meu CMV."
  ];

  return (
    <ChatInterface 
      title="Assistente Estratégico"
      subtitle="Análise baseada nos seus dados operacionais reais."
      contextData={dataSnapshot}
      scope="store"
      suggestions={suggestions}
      isAiConfigured={isAiConfigured}
      emptyStateMessage={!dataSnapshot ? "Ainda não há dados suficientes (produtos ou vendas) para gerar esta análise inteligente." : undefined}
    />
  );
}
