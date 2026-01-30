'use client';

/**
 * @fileOverview Página de Inteligência Artificial para o Lojista.
 * 
 * Provê insights sobre a operação da loja (Vendas, CMV, Estoque).
 */

import { useAuth } from '@/components/auth-provider';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useMemo } from 'react';

export default function StoreAiPage() {
  const { store, products, sales, customers, accessStatus } = useAuth();

  const dataSnapshot = useMemo(() => ({
    loja: {
      nome: store?.name,
      plano: accessStatus?.plano_nome,
      data_expiracao: accessStatus?.data_fim_acesso,
    },
    resumo_estoque: products.map(p => ({
      nome: p.name,
      categoria: p.category,
      preco: p.price_cents / 100,
      custo: (p.cost_cents || 0) / 100,
      qtd: p.stock_qty,
      min: p.min_stock_qty
    })),
    vendas_recentes: sales.slice(0, 50).map(s => ({
      data: s.created_at,
      total: s.total_cents / 100,
      metodo: s.payment_method,
      itens: s.items?.length
    })),
    clientes_count: customers.length
  }), [store, products, sales, customers, accessStatus]);

  const suggestions = [
    "Qual minha margem de lucro média?",
    "Quais produtos estão acabando?",
    "Resuma meu faturamento desta semana.",
    "Quem são meus clientes mais ativos?",
    "Sugira formas de reduzir meu CMV."
  ];

  return (
    <div className="space-y-6">
      <ChatInterface 
        title="Assistente de Negócios"
        subtitle="Insights baseados no seu estoque, vendas e faturamento."
        contextData={dataSnapshot}
        scope="store"
        suggestions={suggestions}
      />
    </div>
  );
}
