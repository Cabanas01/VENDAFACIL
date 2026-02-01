export type CheckoutProvider = 'hotmart';
export type PlanID = 'trial' | 'semanal' | 'mensal' | 'anual';

export type PlanConfig = {
    name: string;
    description: string;
    price: string;
    periodicity: string;
    benefits: string[];
    isFree?: boolean;
}

// Configuração central para os planos, usada para construir a UI da página de faturamento.
// Os PlanIDs agora correspondem EXATAMENTE aos valores permitidos no banco de dados.
export const PLANS_CONFIG: Record<PlanID, PlanConfig> = {
    trial: {
        name: 'Avaliação Gratuita',
        description: 'Experimente todos os recursos sem compromisso.',
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
    semanal: {
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
    mensal: {
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
    anual: {
        name: 'Anual',
        description: 'Economize mais com o plano anual!',
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

// Links de checkout sincronizados com as chaves do banco.
export const CHECKOUT_LINKS: Record<CheckoutProvider, Partial<Record<PlanID, string>>> = {
  hotmart: {
    semanal: 'https://pay.hotmart.com/A104103229T?off=gczhreyg',
    mensal: 'https://pay.hotmart.com/A104103229T?off=3py3921r&bid=1769483117758',
    anual: 'https://pay.hotmart.com/A104103229T?off=aa1nsl3j',
  },
};