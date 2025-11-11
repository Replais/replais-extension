import { getComposer } from "./uiState";

export const insert = (text: string) => {
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