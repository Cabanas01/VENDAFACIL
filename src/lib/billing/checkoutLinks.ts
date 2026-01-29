export type CheckoutProvider = 'hotmart';
export type PlanID = 'free' | 'weekly' | 'monthly' | 'yearly';

export type PlanConfig = {
    name: string;
    description: string;
    price: string;
    periodicity: string;
    benefits: string[];
    isFree?: boolean;
}

// Configuração central para os planos, usada para construir a UI da página de billing.
export const PLANS_CONFIG: Record<PlanID, PlanConfig> = {
    free: {
        name: 'Plano Gratuito',
        description: 'Comece a usar agora com um teste de 7 dias.',
        price: 'Grátis',
        periodicity: '7 dias',
        benefits: [
            'Cadastro de produtos ilimitado',
            'Frente de Caixa (PDV)',
            'Controle de estoque básico',
            'Relatórios simples'
        ],
        isFree: true,
    },
    weekly: {
        name: 'Semanal',
        description: 'Acesso completo por 7 dias.',
        price: 'R$9,90',
        periodicity: 'semana',
        benefits: [
            'Todos os benefícios do plano gratuito',
            'Suporte via WhatsApp',
            'Análise de dados com IA',
            'Sem anúncios'
        ],
    },
    monthly: {
        name: 'Mensal',
        description: 'O plano mais flexível. Cancele quando quiser.',
        price: 'R$29,90',
        periodicity: 'mês',
        benefits: [
            'Todos os benefícios do plano semanal',
            'Acesso a todos os relatórios',
            'Múltiplos usuários',
            'Backup automático'
        ],
    },
    yearly: {
        name: 'Anual',
        description: 'Economize 75% com o plano anual!',
        price: 'R$297,00',
        periodicity: 'ano',
        benefits: [
            'Todos os benefícios do plano mensal',
            'Acesso prioritário a novas funções',
            'Melhor custo-benefício',
            'Suporte premium'
        ],
    }
};

// Links de checkout para cada provedor e plano.
export const CHECKOUT_LINKS: Record<CheckoutProvider, Partial<Record<PlanID, string>>> = {
  hotmart: {
    weekly: 'https://pay.hotmart.com/A104103229T?off=gczhreyg',
    monthly: 'https://pay.hotmart.com/A104103229T?off=3py3921r&bid=1769483117758',
    yearly: 'https://pay.hotmart.com/A104103229T?off=aa1nsl3j',
  },
};
