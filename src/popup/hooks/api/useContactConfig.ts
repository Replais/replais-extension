// src/popup/api/useContactConfig.ts
import { useMemo } from 'react';
import type { ContactConfig, PlatformId } from '@/types/main.types';
import { useUserSettings } from './useUserSettings';

type UseContactConfigResult = {
  contactConfig: ContactConfig | null;
  isLoading: boolean;
  error: Error | null;
};

export const useContactConfig = (platform?: PlatformId, contactKey?: string): UseContactConfigResult => {
  const { data, isLoading, error } = useUserSettings(platform);

  const contactConfig = useMemo<ContactConfig | null>(() => {
    if (!data || !contactKey) return null;

    const existing = data.contacts[contactKey];
    if (existing) return existing;

    // If contact is new, create default config based on global defaults
    return {
      contactKey,
      platform: platform as PlatformId,
      displayName: contactKey.split('|')[1] ?? 'Unknown',
    };
  }, [data, contactKey, platform]);

  return {
    contactConfig,
    isLoading,
    error: error ?? null,
  };
};