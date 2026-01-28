'use client';

import { useAuth } from '@/components/auth-provider';
import type { StoreAccessStatus } from '@/lib/types';

type UseAccessOutput = {
  accessStatus: StoreAccessStatus | null;
  isAllowed: boolean;
  isLoading: boolean;
};

export function useAccess(): UseAccessOutput {
  const { accessStatus, loading } = useAuth();

  return {
    accessStatus,
    isAllowed: accessStatus?.acesso_liberado ?? false,
    isLoading: loading || !accessStatus,
  };
}
