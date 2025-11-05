import type { MessageContext, PlatformId } from '../../types/main.types';

export interface SiteAdapter {
  id: PlatformId;
  matches(url: string): boolean;
  getContactKey(): string;
  getContext(options?: { limit?: number }): MessageContext | null;
  // where to insert text on this site (composer / input)
  getComposer(): HTMLElement | null;
  getConversationTitle(): string | null;
}

// registry of all adapters
const adapters: SiteAdapter[] = [];

export function registerAdapter(adapter: SiteAdapter) {
  adapters.push(adapter);
}

// pick the first adapter that matches current URL
export function detectAdapter(url: string): SiteAdapter | null {
  for (const adapter of adapters) {
    if (adapter.matches(url)) return adapter;
  }
  return null;
}