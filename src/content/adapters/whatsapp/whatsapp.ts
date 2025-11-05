// src/content/adapters/whatsapp.ts
import type { SiteAdapter } from '@/content/adapters/adapters';
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
  const header = document.querySelector<HTMLElement>('header');
  const titleEl = header?.querySelector<HTMLElement>('span');
  return titleEl?.textContent?.trim() ?? null;
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

export const whatsappAdapter: SiteAdapter = {
  id: 'whatsapp',
  matches: (url) => url.includes('web.whatsapp.com'),
  getContext: (options) => buildWhatsAppContext(options?.limit ?? 10),
  getComposer: () => getWhatsAppComposer(),
  getContactKey: () => getContactKey(),
  getConversationTitle: () => getConversationTitle(),
};