export type CheckoutProvider = 'kiwify' | 'hotmart' | 'perfectpay';
export type PlanType = 'weekly' | 'monthly' | 'yearly';

export const CHECKOUT_LINKS: Record<CheckoutProvider, Record<PlanType, string>> = {
  kiwify: {
    weekly: 'https://pay.kiwify.com.br/placeholder_semanal',
    monthly: 'https://pay.kiwify.com.br/placeholder_mensal',
    yearly: 'https://pay.kiwify.com.br/placeholder_anual',
  },
  hotmart: {
    weekly: 'https://pay.hotmart.com/placeholder_semanal',
    monthly: 'https://pay.hotmart.com/placeholder_mensal',
    yearly: 'https://pay.hotmart.com/placeholder_anual',
  },
  perfectpay: {
    weekly: 'https://app.perfectpay.com.br/placeholder_semanal',
    monthly: 'https://app.perfectpay.com.br/placeholder_mensal',
    yearly: 'https://app.perfectpay.com.br/placeholder_anual',
  },
};
