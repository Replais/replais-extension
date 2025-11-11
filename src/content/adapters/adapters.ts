import type { MessageContext, PlatformId } from '../../types/main.types';

export interface DotPositionConfig {
  // The element to mount the dot relative to (defaults to composer)
  mountTarget?: HTMLElement | null;
  // CSS positioning styles
  position?: Partial<CSSStyleDeclaration>;
}

export interface SiteAdapter {
  id: PlatformId;
  matches(url: string): boolean;
  getContactKey(): string;
  getContext(options?: { limit?: number }): MessageContext | null;
  // where to insert text on this site (composer / input)
  getComposer(): HTMLElement | null;
  getConversationTitle(): string | null;
  // Optional: platform-specific dot positioning
  getDotPositionConfig?(composer: HTMLElement): DotPositionConfig | null;
  // Optional: set up efficient observer for conversation changes
  // Should call onContactChange callback when contact/conversation changes
  // Implementation should be optimized (debounced, targeted DOM watching)
  setupConversationObserver?(onContactChange: () => void): void;
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