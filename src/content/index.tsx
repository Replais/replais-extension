import React from 'react';
import  ReactDOM  from 'react-dom/client';
import type {  ReplaisReply, ReplaisRequest, UserContextForRequest } from "@/types/main.types";
import { detectAdapter, registerAdapter, type SiteAdapter } from "./adapters/adapters";
import { whatsappAdapter } from "./adapters/whatsapp/whatsapp";
import { loadUserSettings } from "@/utils/storage";
import { getUiState } from "./utils/uiState";
import { insert } from "./utils/insert";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReplaisComposerWidget } from './ui/ReplaisComposerWidget';
import { ThemeProvider } from '../components/theme-provider';
import '../index.css'

// Inject Lexend font link if not already present
// This ensures the font loads in content script context
if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Lexend"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap';
  document.head.appendChild(link);
}

// Apply Lexend font to Radix portals with higher specificity
const styleId = 'replais-font-style';
if (!document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Target actual Radix content elements with high specificity */
    [data-radix-popover-content],
    [data-radix-popover-content] *,
    [data-radix-select-content],
    [data-radix-select-content] *,
    body [data-radix-popover-content],
    body [data-radix-popover-content] *,
    body [data-radix-select-content],
    body [data-radix-select-content] * {
      font-family: 'Lexend', system-ui, Avenir, Helvetica, Arial, sans-serif !important;
    }
  `;
  document.head.appendChild(style);
}

const queryClient = new QueryClient();
let replaisDotMounted = false;
let currentContactKey: string | null = null;
let currentContainer: HTMLElement | null = null;

console.log("[ReplAIs] content script loaded on - 8 November 2025", window.location.href);
// register all platform adapters here
registerAdapter(whatsappAdapter);

const getUserContext = async (): Promise<UserContextForRequest> => {
  const adapter = detectAdapter(location.href);
  const contactKey = adapter?.getContactKey() ?? "";
  const conversationTitle = adapter?.getConversationTitle() ?? "";
  const settings = await loadUserSettings();
  const contactCfg = settings.contacts[contactKey];
  return {
    personaId: contactCfg?.personaId ?? "default",
    tone: contactCfg?.tone ?? "casual",
    platform: adapter?.id ?? "unknown",
    contactKey,
    conversationTitle,
    contactInstructions: contactCfg?.instructions ?? "",
  };
};

// === common layer that talks to backend/AI ===
async function fetchSuggestion(): Promise<ReplaisReply | null> {
  const adapter = detectAdapter(location.href);
  console.log("[ReplAIs] adapter:", adapter);
  const context = adapter?.getContext({ limit: 10 }) ?? null;
  if (!context) {
    console.warn("[ReplAIs] No context available for this site.");
    return null;
  }
  const uiState = getUiState();
  const userContext = await getUserContext();
  // TODO: pull these from storage / popup later
  const request: ReplaisRequest = {
    context,
    userContext,
    uiState,
  };

  console.log("[ReplAIs] request payload:", request);

  // For now, mock it:
  const reply: ReplaisReply = {
    replyText: "Hello from ReplAIs 👋 (real AI coming soon)",
  };

  // later: replace with real fetch to your Go backend:
  // const res = await fetch('https://api.replais.in/v1/suggest', {...});
  // const reply = await res.json();
  return reply;
}

const handleSuggest = async () => {
  const reply = await fetchSuggestion();
  if (!reply) return;
  insert(reply.replyText);
};

// listen for messages from background / popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "SUGGEST_REPLY") {
    handleSuggest();
  }
  if (msg?.type === 'GET_META') {
    const adapter = detectAdapter(location.href);
    const platform = adapter?.id ?? '';
    const conversationTitle = adapter?.getConversationTitle() ?? '';
    if(!platform || !conversationTitle) {
      chrome.runtime.sendMessage({
        ok: false,
        message: 'No platform or conversation title found',
      });
      return;
    }else {
      chrome.runtime.sendMessage({
        ok: true,
        platform,
        conversationTitle,
      });
    }
  }
});


const mountReplaisDot = (adapter: SiteAdapter, forceRemount = false) => {
  const composer = adapter.getComposer();
  const contactKey = adapter.getContactKey();
  
  // If no contact key, we can't proceed
  if (!contactKey) {
    console.warn('[ReplAIs] No contact key found.');
    return false;
  }

  // Check if contact changed - need to remount
  const contactChanged = currentContactKey !== contactKey;
  if (contactChanged || forceRemount) {
    console.log('[ReplAIs] Contact changed or force remount:', {
      oldKey: currentContactKey,
      newKey: contactKey,
      forceRemount,
    });
    
    // Clean up old container if it exists
    if (currentContainer) {
      try {
        // Check if container is still in DOM before removing
        if (currentContainer.parentElement) {
          currentContainer.parentElement.removeChild(currentContainer);
        }
        // Also try to unmount React root if possible
        const root = (currentContainer as any)._reactRootContainer;
        if (root) {
          // React 18+ root can be unmounted
          try {
            const reactRoot = (currentContainer as any)._reactRootContainer;
            if (reactRoot && reactRoot.render) {
              reactRoot.render(null);
            }
          } catch (e) {
            // Ignore unmount errors
          }
        }
      } catch (e) {
        console.warn('[ReplAIs] Error cleaning up old container:', e);
      }
      currentContainer = null;
    }
    replaisDotMounted = false;
    currentContactKey = contactKey;
  }

  // If no composer yet, we need to wait
  if (!composer) {
    console.warn('[ReplAIs] No composer found to mount dot for contact:', contactKey);
    return false;
  }

  // If already mounted for this contact, verify it's still valid
  if (replaisDotMounted && currentContactKey === contactKey && currentContainer) {
    // Verify container is still in DOM and attached to the correct composer
    const mountTarget = adapter.getDotPositionConfig?.(composer)?.mountTarget ?? composer;
    const isContainerValid = currentContainer.parentElement === mountTarget ||
                             mountTarget?.contains(currentContainer);
    
    if (isContainerValid) {
      return true; // Already mounted correctly
    } else {
      // Container exists but is in wrong place, need to remount
      console.log('[ReplAIs] Container exists but in wrong place, remounting');
      replaisDotMounted = false;
      if (currentContainer.parentElement) {
        currentContainer.parentElement.removeChild(currentContainer);
      }
      currentContainer = null;
    }
  }

  // Avoid duplicate mounts - check in composer and its parent
  const positionConfig = adapter.getDotPositionConfig?.(composer);
  const mountTarget = positionConfig?.mountTarget ?? composer;
  const existingContainer = mountTarget?.querySelector('.replais-dot-container');
  
  if (existingContainer && existingContainer !== currentContainer) {
    // Found existing container that's not our tracked one - clean it up
    console.log('[ReplAIs] Found orphaned container, cleaning up');
    existingContainer.parentElement?.removeChild(existingContainer);
  }

  if (!mountTarget) {
    console.warn('[ReplAIs] Could not find mount target for dot.');
    return false;
  }

  // Make mount target relatively positioned if needed
  const style = window.getComputedStyle(mountTarget);
  if (style.position === 'static') {
    mountTarget.style.position = 'relative';
  }

  const container = document.createElement('div');
  container.className = 'replais-dot-container';
  
  // Apply platform-specific styles or use defaults
  const defaultStyles: Partial<CSSStyleDeclaration> = {
    position: 'absolute',
    right: '8px',
    bottom: '8px',
    zIndex: '9999',
    pointerEvents: 'auto',
  };

  Object.assign(container.style, positionConfig?.position ?? defaultStyles);
  mountTarget.appendChild(container);
  currentContainer = container;

  // Create a ref object for the container to pass to ThemeProvider
  // We'll use a callback ref pattern since we already have the DOM element
  const containerRef = { current: container } as React.RefObject<HTMLDivElement>;

  const root = ReactDOM.createRoot(container);

  root.render(
    <React.StrictMode>
      <ThemeProvider containerRef={containerRef}>
        <QueryClientProvider client={queryClient}>
          <ReplaisComposerWidget
            platform={adapter.id}
            adapter={adapter}
          />
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
  replaisDotMounted = true;
  currentContactKey = contactKey;
  console.log('[ReplAIs] ReplAIs dot mounted for contact:', contactKey);
  return true;
}


function init() {
  const adapter = detectAdapter(window.location.href);
  if (!adapter) {
    console.log('[ReplAIs] No adapter for this site.');
    return;
  }

  console.log('[ReplAIs] Adapter detected:', adapter.id);

  // Function to attempt mounting
  const attemptMount = () => {
    return mountReplaisDot(adapter);
  };

  // Initial mount attempt
  let attempts = 0;
  const maxAttempts = 10;

  const intervalId = setInterval(() => {
    attempts += 1;

    const mounted = attemptMount();
    if (mounted) {
      clearInterval(intervalId);
      
      // Set up platform-specific conversation observer if available
      if (adapter.setupConversationObserver) {
        adapter.setupConversationObserver(() => {
          console.log('[ReplAIs] Contact changed, remounting dot');
          
          // Retry mechanism: try multiple times with increasing delays
          // This handles cases where the composer isn't ready immediately
          let retryCount = 0;
          const maxRetries = 5;
          const retryDelays = [300, 500, 800, 1200, 2000]; // Progressive delays
          
          const retryMount = () => {
            const mounted = mountReplaisDot(adapter, true); // Force remount
            
            if (!mounted && retryCount < maxRetries) {
              const delay = retryDelays[retryCount] || 2000;
              console.log(`[ReplAIs] Mount failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
              setTimeout(retryMount, delay);
              retryCount++;
            } else if (mounted) {
              console.log('[ReplAIs] Dot successfully remounted after contact change');
            } else {
              console.warn('[ReplAIs] Failed to remount dot after all retries');
            }
          };
          
          // Start retry sequence
          setTimeout(retryMount, 300); // Initial delay
        });
      }
      return;
    }

    if (attempts >= maxAttempts) {
      console.log('[ReplAIs] Giving up mounting dot after timeout.');
      clearInterval(intervalId);
    }
  }, 2000);
}

init();