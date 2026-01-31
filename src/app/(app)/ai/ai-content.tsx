'use client';

/**
 * @fileOverview Componente de Cliente para IA.
 * 
 * Recebe o status de configuração do servidor e gerencia o snapshot de dados.
 */

import { useAuth } from '@/components/auth-provider';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useMemo } from 'react';

export default function StoreAiContent({ isAiConfigured }: { isAiConfigured: boolean }) {
  const { store, products, sales, customers, accessStatus } = useAuth();

  const dataSnapshot = useMemo(() => {
    if (!isAiConfigured) return null;

    const limitedProducts = products.slice(0, 100).map(p => ({
      nome: p.name,
      categoria: p.category,
      preco: (p.price_cents || 0) / 100,
      custo: (p.cost_cents || 0) / 100,
      qtd: p.stock_qty,
      min: p.min_stock_qty
    }));

    const limitedSales = sales.slice(0, 30).map(s => ({
      data: s.created_at,
      total: (s.total_cents || 0) / 100,
      metodo: s.payment_method,
      itens: s.items?.length
    }));

    return {
      loja: {
        nome: store?.name,
        plano: accessStatus?.plano_nome,
        data_expiracao: accessStatus?.data_fim_acesso,
      },
      resumo_estoque: limitedProducts,
      vendas_recentes: limitedSales,
      clientes_count: (customers || []).length
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
      title="Assistente de Negócios"
      subtitle="Insights baseados no seu estoque, vendas e faturamento real."
      contextData={dataSnapshot}
      scope="store"
      suggestions={suggestions}
      isAiConfigured={isAiConfigured}
    />
  );
}
