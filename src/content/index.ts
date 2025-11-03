console.log('[ReplAIs] content script loaded on', window.location.href);

function getComposer(): HTMLElement | null {

  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    (active.isContentEditable ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'INPUT' ||
      active.tagName === 'DIV')
  ) {
    return active;
  }

  const textarea =
    document.querySelector('textarea') ||
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
  if (typeof asText.value === 'string') {
    const start = asText.selectionStart ?? asText.value.length;
    const end = asText.selectionEnd ?? asText.value.length;
    asText.value = asText.value.slice(0, start) + text + asText.value.slice(end);
    asText.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (el.isContentEditable) {
    document.execCommand('insertText', false, text);
  }
}

function handleSuggest() {
  insert('Hello from ReplAIs 👋'); // placeholder
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'SUGGEST_REPLY') {
    handleSuggest();
  }
});