// src/content/ui/ReplaisPopper.tsx
import * as React from 'react';
import type {
  PlatformId,
  ReplaisRequest,
  MessageContext,
} from '@/types/main.types';
import type { SiteAdapter } from '../adapters/adapters';
import { getUiState } from '../utils/uiState';
import { insert } from '../utils/insert';

import { useReply } from '@/popup/hooks/api/useReply';
import { useContactConfig } from '@/popup/hooks/api/useContactConfig';

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { GiAbstract002, GiSettingsKnobs } from 'react-icons/gi';

type Props = {
  platform: PlatformId;
  adapter: SiteAdapter;
};

export const ReplaisComposerWidget: React.FC<Props> = ({
  platform,
  adapter,
}) => {
  const [open, setOpen] = React.useState(false);
  
  // Compute contact info when popover opens (not on mount)
  const [contactKey, setContactKey] = React.useState<string>('');
  const [conversationTitle, setConversationTitle] = React.useState<string>('');

  // Update contact info when popover opens
  React.useEffect(() => {
    if (open) {
      const key = adapter.getContactKey();
      const title = adapter.getConversationTitle() ?? 'this conversation';
      console.log({key, title})
      setContactKey(key);
      setConversationTitle(title);
    }
  }, [open, adapter]);

  const { contactConfig, isLoading, error } = useContactConfig(
    platform, 
    contactKey || undefined
  );
  const { mutateAsync, isPending } = useReply(platform);

  const [personaId, setPersonaId] = React.useState<string>('default');
  const [tone, setTone] = React.useState<string>('neutral');
  const [contactInstructions, setContactInstructions] = React.useState<string>('');
  const [replyInstructions, setReplyInstructions] = React.useState<string>('');

  // hydrate from saved contact config
  React.useEffect(() => {
    if (!contactConfig) return;
    setPersonaId(contactConfig.personaId ?? 'default');
    setTone(contactConfig.tone ?? 'neutral');
    setContactInstructions(contactConfig.instructions ?? '');
  }, [contactConfig]);

  const handleGetReply = async () => {
    if (!contactKey) {
      console.warn('[ReplAIs] No contact key available.');
      return;
    }

    const ctx: MessageContext | null = adapter.getContext({ limit: 12 });
    if (!ctx) {
      console.warn('[ReplAIs] No conversation context found. Open a chat and try again.');
      return;
    }

    const uiState = getUiState();

    const request: ReplaisRequest = {
      context: ctx,
      uiState,
      userContext: {
        contactKey,
        platform,
        conversationTitle,
        personaId,
        tone,
        contactInstructions,
        replyInstructions: replyInstructions || '',
      },
    };

    try {
      const response = await mutateAsync(request);
      if (response.replyText) {
        insert(response.replyText);
        setReplyInstructions('');
        setOpen(false);
      }
    } catch (err) {
      console.error('[ReplAIs] error getting reply:', err);
    }
  };

  const isBusy = isPending || isLoading;
  console.log({isBusy, isPending, isLoading})

  if (error) {
    console.warn('[ReplAIs] contactConfig error in popover:', error);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* This is the nice little dot in the composer */}
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open ReplAIs"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          className="replais-dot inline-flex items-center justify-center rounded-full w-7 h-7 text-xs font-bold
                     bg-gradient-to-br from-primary-x to-primary-x/90 text-white shadow-lg 
                     hover:primary-x/80 hover:shadow-xl 
                     active:scale-95 transition-all duration-200
                     focus:outline-none focus:ring-2 focus:primary-x/10 focus:ring-offset-2 flex-shrink-0"
          style={{
            pointerEvents: 'auto',
            cursor: 'pointer',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          r
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-80 p-4 space-y-3 border shadow-xl rounded-xl bg-background z-[10001]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        {contactKey && (
          <>
            <div className="space-y-1">
              <div className="font-medium text-muted-foreground tracking-wide text-xs">
                ReplAIs for
              </div>
              <div className="text-sm text-primary font-semibold truncate">
                {conversationTitle || 'this conversation'}
              </div>
            </div>

        {/* Persona */}
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="flex items-center gap-1 text-muted-foreground">
          <GiAbstract002 size="0.75rem" />
          <Label className="text-xs text-muted-foreground">Persona</Label>
          </div>
          <Select value={personaId} onValueChange={setPersonaId}>
            <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[10002]">
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="buddy">Buddy</SelectItem>
              <SelectItem value="ceo">CEO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tone */}
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="flex items-center gap-1 text-muted-foreground">
          <GiSettingsKnobs size="0.75rem" />
          <Label className="text-xs text-muted-foreground">Tone</Label>
          </div>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[10002]">
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="apology">Apology</SelectItem>
              <SelectItem value="flirty">Flirty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contact-level instructions */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            How do you usually talk to this person?
          </Label>
          <Textarea
            className="h-16 resize-none text-xs"
            placeholder="e.g. Close friend, we joke a lot but avoid work talk."
            value={contactInstructions}
            onChange={(e) => setContactInstructions(e.target.value)}
          />
        </div>

        {/* This-reply-only instructions */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Extra context for this reply only
          </Label>
          <Textarea
            className="h-16 resize-none text-xs"
            placeholder="e.g. I'm tired, keep it short but not rude."
            value={replyInstructions}
            onChange={(e) => setReplyInstructions(e.target.value)}
          />
        </div>

            <Button
              size="sm"
              className="w-full mt-1"
              variant="default"
              disabled={isBusy || !contactKey}
              onClick={handleGetReply}
            >
              {isPending ? 'Thinking…' : 'Generate reply'}
            </Button>
          </>
        )}
        {!contactKey && (
          <div className="text-sm text-muted-foreground">Loading...</div>
        )}
      </PopoverContent>
    </Popover>
  );
};