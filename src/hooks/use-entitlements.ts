'use client';

import { useAuth } from '@/components/auth-provider';
import type { Entitlement } from '@/lib/types';

type UseEntitlementsOutput = {
  entitlements: Entitlement | null;
  hasAccess: (feature: string) => boolean;
  getLimit: (limit: string) => number;
  isLoading: boolean;
};

export function useEntitlements(): UseEntitlementsOutput {
  const { entitlements, loading } = useAuth();

  const hasAccess = (feature: string): boolean => {
    if (!entitlements) return false;
    return entitlements.features?.[feature] ?? false;
  };

  const getLimit = (limit: string): number => {
    if (!entitlements) return 0;
    return entitlements.limits?.[limit] ?? 0;
  };

  return {
    entitlements,
    hasAccess,
    getLimit,
    isLoading: loading || !entitlements,
  };
}
