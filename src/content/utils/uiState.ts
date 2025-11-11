import type { UiState } from "@/types/main.types";
import { detectAdapter } from "../adapters/adapters";

export const getComposer = (): HTMLElement | null =>  {
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


  export const getUiState = (): UiState => {
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
  