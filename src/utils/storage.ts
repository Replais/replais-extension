import type { ContactConfig, PlatformId, UserSettingsPlatformLevel } from "@/types/main.types";

const SETTINGS_KEY = 'replais:userSettings:v1';

function getDefaultSettings(): UserSettingsPlatformLevel {
  return {
    contacts: {},
    platform: 'whatsapp',
    globalInstructions: '',
  };
}

export async function loadUserSettings(): Promise<UserSettingsPlatformLevel> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(SETTINGS_KEY, (res) => {
      const stored = res[SETTINGS_KEY] as UserSettingsPlatformLevel | undefined;
      if (!stored) {
        const defaults = getDefaultSettings();
        resolve(defaults);
        return;
      }
      resolve(stored);
    });
  });
}

export async function saveUserSettings(settings: UserSettingsPlatformLevel): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [SETTINGS_KEY]: settings }, () => resolve());
  });
}

// Same as before:
export function generateContactKey(platform: string, title?: string | null): string {
  const t = (title ?? '').trim() || 'unknown';
  return `${platform}|${t.toLowerCase()}`;
}

export async function upsertContactConfig(config: ContactConfig): Promise<void> {
  const settings = await loadUserSettings();
  settings.contacts[config.contactKey] = config;
  await saveUserSettings(settings);
}

export async function getContactConfig(
  platform: PlatformId,
  title?: string | null,
): Promise<ContactConfig | null> {
  const settings = await loadUserSettings();
  const contactKey = generateContactKey(platform, title);
  const existing = settings.contacts[contactKey];
  if (existing) return existing;

  return {
    contactKey,
    displayName: title ?? 'Unknown',
    platform,
  };
}

