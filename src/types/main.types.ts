export type PlatformId =
  | "whatsapp"
  | "gmail"
  | "slack"
  | "linkedin"
  | "generic"
  | "unknown";

// who is speaking
export type AuthorKind = "self" | "other" | "system";

export interface Participant {
  id?: string; // platform-specific id if we ever have it
  name: string;
  kind: AuthorKind; // self / other / system
}

export interface Attachment {
  kind: "image" | "file" | "audio" | "video" | "link" | string;
  mimeType?: string;
  url?: string;
  fileName?: string;
  altText?: string;
}

// single message in a conversation
export interface Message {
  id?: string; // optional platform message id
  authorKind: AuthorKind; // self / other / system
  authorName?: string;
  text: string; // plain text we send to the model
  timestamp?: string; // ISO or raw string - we'll normalize later
  attachments?: Attachment[];
  // for debugging / future:
  raw?: unknown; // platform-specific blob (data-pre-plain-text, etc.)
}

// unified context for any platform
export interface MessageContext {
  conversationId?: string; // e.g. email thread id, chat id
  participants: Participant[];
  messages: Message[]; // ordered oldest → newest
  // misc platform-specific details if needed
  meta?: Record<string, unknown>;
}

export interface UserContextForRequest {
  // identifies who/what this conversation is about
  contactKey: string; // e.g. "whatsapp|shivam zomato"
  platform: PlatformId; // 'whatsapp', 'gmail', etc.
  conversationTitle: string; // "Shivam Zomato"
  // what the user *wants for this contact right now*
  personaId?: string; // "buddy", "ceo" (optional override)
  tone?: ToneId; // "casual", "formal", etc.
  // optional: only if they just edited instructions *for this chat now*
  contactInstructions: string;
  replyInstructions?: string; // this reply only
}

export interface UiState {
  currentDraft?: string;
  selectionText?: string;
  replyTargetSummary?: string;
}

// what we send to your backend/AI
export interface ReplaisRequest {
  context: MessageContext;
  // user-level controls
  userContext: UserContextForRequest;
  // UI state at the moment of call
  uiState?: UiState;
}

// what your backend returns
export interface ReplaisReply {
  replyText: string;
  updatedContactConfig?: ContactConfig;
}

export type ToneId = "casual" | "formal" | "flirty" | "apology" | string;

export interface PersonaConfig {
  id: string; // "default", "buddy", "ceo", etc.
  label: string; // UI label: "Default", "Buddy", "CEO"
  description?: string; // “Sounds like a close, chill friend…”
  icon?: string;
}

export interface ContactConfig {
  contactKey: string; // `${platform}|${conversationTitle}`
  platform: PlatformId;
  displayName: string; // "Shivam Zomato"
  personaId?: PersonaConfig["id"]; // e.g. "buddy"
  tone?: ToneId; // e.g. "casual"
  instructions?: string; // e.g. "We are close friends..."
}

export interface UserSettingsPlatformLevel {
  platform: PlatformId;
  contacts: Record<string, ContactConfig>;
  globalInstructions?: string; // we may still use this locally in prompts for now
}
