import { useQuery } from '@tanstack/react-query';

export type ReplaisMeta = {
  ok: boolean;
  platform?: string;
  conversationTitle?: string | null;
  contactKey?: string;
};

export const queryKeyReplaisMeta = ['replais', 'meta'] as const;

const getReplaisMeta = async (): Promise<ReplaisMeta> => {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        resolve({ ok: false });
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'GET_META' }, (resp: ReplaisMeta) => {
        if (!resp || !resp.ok) {
          resolve({ ok: false });
          return;
        }
        resolve(resp);
      });
    });
  });
};

export const useReplaisMeta = () => {
  const result = useQuery<ReplaisMeta, Error>({
    queryKey: queryKeyReplaisMeta,
    queryFn: getReplaisMeta,
    refetchOnWindowFocus: false,
  });

  return result;
};