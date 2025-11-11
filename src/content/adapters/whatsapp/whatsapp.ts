// src/content/adapters/whatsapp.ts
import type { SiteAdapter, DotPositionConfig } from '@/content/adapters/adapters';
import type { Attachment, Message, MessageContext, Participant } from '@/types/main.types';
import { generateContactKey } from '@/utils/storage';

function parsePrePlain(pre: string | null): { timestamp?: string; sender?: string } {
  if (!pre) return {};
  // Example: "[11:11 pm, 3/11/2025] Abhay: "
  const match = pre.match(/^\[(.*?)\]\s*(.*?):\s*$/);
  if (!match) return {};
  const [, ts, sender] = match;
  return { timestamp: ts, sender };
}


function getConversationTitle(): string | null {
  // Get the first header inside #main (the chat header)
  const main = document.querySelector('#main');
  const header = main?.querySelector('header');
  if (!header) return null;
  const titleEl = header.querySelector('span');
  const title = titleEl?.textContent?.trim();
  
  // Filter out invalid titles like "chat-filled-refreshed"
  if (title && 
      !title.includes('chat-filled') && 
      !title.includes('refreshed') &&
      title.length > 0 && 
      title.length < 100) {
    return title;
  }
  
  return null;
}

function getContactKey(): string {
  return generateContactKey('whatsapp', getConversationTitle());
}

function buildWhatsAppContext(limit: number = 10): MessageContext | null {
  // main chat area
  const main = document.querySelector<HTMLElement>('#main');
  if (!main) return null;

  // messages container
  const messagesContainer = main.querySelector<HTMLElement>(
    'div[data-scrolltracepolicy="wa.web.conversation.messages"]',
  );
  if (!messagesContainer) return null;

  const bubbleNodes = Array.from(
    messagesContainer.querySelectorAll<HTMLDivElement>(
      'div[role="row"] div.message-in, div[role="row"] div.message-out',
    ),
  );

  const lastBubbles = bubbleNodes.slice(-limit);

  const messages: Message[] = [];
  const participantsMap = new Map<string, Participant>();

  for (const bubble of lastBubbles) {
    const isOut = bubble.classList.contains('message-out');
    const attachments: Attachment[] = [];

    const copyable = bubble.querySelector<HTMLDivElement>('div.copyable-text');
    const rawPre = copyable?.getAttribute('data-pre-plain-text') ?? null;
    const { timestamp, sender } = parsePrePlain(rawPre);

    const textSpan = bubble.querySelector<HTMLSpanElement>(
      'span._ao3e.selectable-text.copyable-text > span',
    );
    const text = (textSpan?.textContent || '').trim();
    const conversationTitle = getConversationTitle() ?? '';
    const mediaImg = bubble.querySelector<HTMLImageElement>('img');
    const authorName = isOut ? 'You' : sender || conversationTitle || 'Them';
    if (mediaImg) {
      attachments.push({
        kind: 'image',
        mimeType: mediaImg.src.startsWith('data:image') ? 'image/*' : undefined,
        url: mediaImg.src,
        altText: mediaImg.alt || undefined,
      });
    }
    const authorKind = isOut ? 'self' : 'other';

    if (!participantsMap.has(authorName)) {
      participantsMap.set(authorName, {
        name: authorName,
        kind: authorKind,
      });
    }

    messages.push({
      authorKind,
      authorName,
      text,
      timestamp,
      raw: { pre: rawPre },
    });
  }

  // ensure "You" participant exists at least once
  if (!participantsMap.has('You')) {
    participantsMap.set('You', { name: 'You', kind: 'self' });
  }

  const participants = Array.from(participantsMap.values());

  const ctx: MessageContext = {
    participants,
    messages,
    meta: {
      isGroup: participants.length > 2,
    },
  };
  return ctx;
}

function getWhatsAppComposer(): HTMLElement | null {
  // footer composer: a contenteditable div
  const main = document.querySelector<HTMLElement>('#main');
  if (!main) return null;

  const composer = main.querySelector<HTMLElement>(
    'footer div[contenteditable="true"][data-tab]',
  );
  return composer;
}

function getWhatsAppDotPositionConfig(composer: HTMLElement): DotPositionConfig | null {
  // For WhatsApp, the composer is a contenteditable div inside a footer
  // We want to mount the dot relative to the parent container that wraps the input
  // This allows us to position it inside the input area visually
  const parent = composer.parentElement;
  const mountTarget = parent ?? composer;

  return {
    mountTarget,
    position: {
      position: 'absolute',
      right: '45px', // Leave space for the send/mic button
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: '10000',
      pointerEvents: 'auto',
    } as Partial<CSSStyleDeclaration>,
  };
}

// Store timer reference to prevent duplicates
let globalCheckTimer: ReturnType<typeof setInterval> | null = null;

function setupWhatsAppConversationObserver(onContactChange: () => void): void {
  const main = document.querySelector('#main');
  if (!main) {
    // If #main not found yet, wait a bit and try again
    setTimeout(() => setupWhatsAppConversationObserver(onContactChange), 1000);
    return;
  }

  // Clean up existing timer if it exists
  if (globalCheckTimer) {
    clearInterval(globalCheckTimer);
    globalCheckTimer = null;
  }

  // Track last contact key and conversation title
  let lastContactKey: string | null = null;
  let lastConversationTitle: string | null = null;

  // Function to check for contact changes
  const checkForContactChange = () => {
    const currentContactKey = getContactKey();
    const currentConversationTitle = getConversationTitle();
    
    // Check if contact key changed
    const contactKeyChanged = currentContactKey && currentContactKey !== lastContactKey;
    
    // Check if conversation title changed
    const titleChanged = currentConversationTitle && currentConversationTitle !== lastConversationTitle;
    
    if (contactKeyChanged || titleChanged) {
      console.log('[ReplAIs WhatsApp] Contact changed:', {
        oldKey: lastContactKey,
        newKey: currentContactKey,
        oldTitle: lastConversationTitle,
        newTitle: currentConversationTitle,
      });
      
      lastContactKey = currentContactKey;
      lastConversationTitle = currentConversationTitle;
      onContactChange();
    }
  };

  // Initialize last values
  lastContactKey = getContactKey();
  lastConversationTitle = getConversationTitle();

  // Simple polling: check every 5 seconds
  globalCheckTimer = setInterval(() => {
    checkForContactChange();
  }, 5000) as unknown as ReturnType<typeof setInterval>;

  console.log('[ReplAIs WhatsApp] Conversation observer set up with polling (5 seconds)');
}

export const whatsappAdapter: SiteAdapter = {
  id: 'whatsapp',
  matches: (url) => url.includes('web.whatsapp.com'),
  getContext: (options) => buildWhatsAppContext(options?.limit ?? 10),
  getComposer: () => getWhatsAppComposer(),
  getContactKey: () => getContactKey(),
  getConversationTitle: () => getConversationTitle(),
  getDotPositionConfig: (composer) => getWhatsAppDotPositionConfig(composer),
  setupConversationObserver: (onContactChange) => setupWhatsAppConversationObserver(onContactChange),
};