import type { ReplaisReply, ReplaisRequest, UiState, UserContextForRequest } from "@/types/main.types";
import { detectAdapter, registerAdapter } from "./adapters/adapters";
import { whatsappAdapter } from "./adapters/whatsapp/whatsapp";
import { loadUserSettings } from "@/utils/storage";

console.log("[ReplAIs] content script loaded on - 2", window.location.href);
// register all platform adapters here
registerAdapter(whatsappAdapter);

function getComposer(): HTMLElement | null {
  const adapter = detectAdapter(location.href);
  if (adapter) {
    const el = adapter.getComposer();
    if (el) return el;
  }
  // fallback: old generic logic
  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    (active.isContentEditable ||
      active.tagName === "TEXTAREA" ||
      active.tagName === "INPUT" ||
      active.tagName === "DIV")
  ) {
    return active;
  }
  const textarea =
    document.querySelector("textarea") ||
    document.querySelector('input[type="text"]');
  if (textarea) return textarea as HTMLElement;

  const editable = document.querySelector('[contenteditable="true"]');
  if (editable) return editable as HTMLElement;

  return null;
}

function insert(text: string) {
  const el = getComposer();
  if (!el) return;

  const asText = el as HTMLTextAreaElement;
  if (typeof asText.value === "string") {
    const start = asText.selectionStart ?? asText.value.length;
    const end = asText.selectionEnd ?? asText.value.length;
    asText.value =
      asText.value.slice(0, start) + text + asText.value.slice(end);
    asText.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (el.isContentEditable) {
    document.execCommand("insertText", false, text);
  }
}

const getUiState = (): UiState => {
  const composer = getComposer();
  let currentDraft: string | undefined;

  if (composer) {
    const asText = composer as HTMLTextAreaElement;
    if (typeof asText.value === "string") {
      currentDraft = asText.value || undefined;
    } else if (composer.isContentEditable) {
      const text = composer.textContent?.trim();
      currentDraft = text || undefined;
    }
  }

  const selection = window.getSelection();
  const selectionRaw = selection?.toString() ?? "";
  const selectionText = selectionRaw.trim() || undefined;

  return {
    currentDraft,
    selectionText,
    // replyTargetSummary: TODO (we’ll handle WhatsApp quoted replies later)
  };
};

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
