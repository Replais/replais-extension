// src/popup/api/useUserSettings.ts
import { useQuery } from '@tanstack/react-query';
import type { UserSettingsPlatformLevel, PlatformId } from '@/types/main.types';
import { loadUserSettings } from '@/utils/storage';
// import { api } from '@/utils/api'; // axios instance

export const queryKeyUserSettings = (platform?: PlatformId) =>
  ['replais', 'userSettings', platform] as const;

const getUserSettings = async (platform: PlatformId): Promise<UserSettingsPlatformLevel> => {
//   const { data } = await api.get<UserSettings>('/v1/settings', {
//     params: { platform },
//   });
//   return data;
console.log('getUserSettings', platform);
const settings = await loadUserSettings();
return settings;
};

export const useUserSettings = (platform?: PlatformId) => {
  const result = useQuery<UserSettingsPlatformLevel, Error>({
    queryKey: queryKeyUserSettings(platform),
    queryFn: () => getUserSettings(platform as PlatformId),
    enabled: !!platform,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return result;
};