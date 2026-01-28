export type CheckoutProvider = 'hotmart';
export type PlanType = 'weekly' | 'monthly' | 'yearly';

// ATENÇÃO: Substitua os links placeholders pelos seus links de checkout reais, se necessário.
export const CHECKOUT_LINKS: Record<CheckoutProvider, Record<PlanType, string>> = {
  hotmart: {
    weekly: 'https://vendafacilbrasil.shop/paginadevendas-semanal',
    monthly: 'https://vendafacilbrasil.shop/paginadevendas-mensal',
    yearly: 'https://vendafacilbrasil.shop/paginadevendas-anual',
  },
};
