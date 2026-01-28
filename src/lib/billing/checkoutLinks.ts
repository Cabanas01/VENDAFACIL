export type CheckoutProvider = 'hotmart';
export type PlanType = 'weekly' | 'monthly' | 'yearly';

export const CHECKOUT_LINKS: Record<CheckoutProvider, Record<PlanType, string>> = {
  hotmart: {
    weekly: 'https://pay.hotmart.com/placeholder_semanal',
    monthly: 'https://pay.hotmart.com/placeholder_mensal',
    yearly: 'https://pay.hotmart.com/placeholder_anual',
  },
};
