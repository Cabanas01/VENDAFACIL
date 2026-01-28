export type CheckoutProvider = 'hotmart';
export type PlanType = 'weekly' | 'monthly' | 'yearly';

// ATENÇÃO: Substitua os links placeholders pelos seus links de checkout reais, se necessário.
export const CHECKOUT_LINKS: Record<CheckoutProvider, Record<PlanType, string>> = {
  hotmart: {
    weekly: 'https://pay.hotmart.com/A104103229T?off=gczhreyg',
    monthly: 'https://pay.hotmart.com/A104103229T?off=3py3921r&bid=1769483117758',
    yearly: 'https://pay.hotmart.com/A104103229T?off=aa1nsl3j',
  },
};
