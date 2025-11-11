// src/popup/api/useReply.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ReplaisRequest,
  ReplaisReply,
  PlatformId,
  UserSettingsPlatformLevel,
  ContactConfig,
} from '@/types/main.types';
import { queryKeyUserSettings } from './useUserSettings';
import { loadUserSettings, saveUserSettings } from '@/utils/storage';

const postReply = async (params: ReplaisRequest): Promise<ReplaisReply> => {
  // 1. Load current settings from chrome.storage
  const settings = await loadUserSettings();

  const {
    contactKey,
    platform,
    conversationTitle,
    personaId,
    tone,
    contactInstructions,
  } = params.userContext;

  // 2. Existing contact or create default shell
  const existing = settings.contacts[contactKey];

  const baseContact: ContactConfig = existing ?? {
    contactKey,
    platform,
    displayName: conversationTitle ?? 'Unknown',
    contactInstructions: '',
  };

  // 3. Merge overrides into contact config
  const updatedContactConfig: ContactConfig = {
    ...baseContact,
    personaId: personaId ?? baseContact.personaId,
    tone: tone ?? baseContact.tone,
    instructions: contactInstructions ?? baseContact.instructions,
  };

  // 4. Save back to chrome.storage
  const newSettings: UserSettingsPlatformLevel = {
    ...settings,
    contacts: {
      ...settings.contacts,
      [contactKey]: updatedContactConfig,
    },
  };

  await saveUserSettings(newSettings);

  // 5. Return reply + updated contact
  return {
    replyText: 'Hello, how are you? This is a reply from ReplAIs',
    updatedContactConfig,
  };
};

export const useReply = (platform: PlatformId) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ReplaisReply, Error, ReplaisRequest>({
    mutationFn: postReply,
    onSuccess: (response: ReplaisReply) => {
      const { updatedContactConfig } = response;
      if (!updatedContactConfig) return;

      queryClient.setQueryData(
        queryKeyUserSettings(platform),
        (prev: UserSettingsPlatformLevel) => {
          return {
            ...prev,
            contacts: {
              ...prev.contacts,
              [updatedContactConfig.contactKey]: updatedContactConfig,
            },
          };
        },
      );
    },
  });

  return mutation;
};