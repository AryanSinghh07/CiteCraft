import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { aiService } from '@/services';
import type { AssistantAction, ChatMessage } from '@/types';

export interface AssistantMessage extends ChatMessage {
  id: string;
  actions?: AssistantAction[];
  /** shown in the chat but not sent back to the model */
  isError?: boolean;
}

const storageKey = (userId: string) => `citecraft:assistant:${userId}`;
const MAX_STORED = 40;

function load(userId: string): AssistantMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as AssistantMessage[]) : [];
  } catch {
    return [];
  }
}

/** Chat state for the assistant, kept for the browser session. */
export function useAssistant() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<AssistantMessage[]>(() => (user ? load(user.id) : []));
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setMessages(user ? load(user.id) : []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    try {
      sessionStorage.setItem(storageKey(user.id), JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      /* storage full or blocked — chat still works */
    }
  }, [messages, user]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isSending) return;
      const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: 'user', content };
      const next = [...messages, userMessage];
      setMessages(next);
      setIsSending(true);

      try {
        const history: ChatMessage[] = next.filter(m => !m.isError).map(({ role, content: c }) => ({ role, content: c }));
        const { reply, actions } = await aiService.chat(history);
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply, actions }]);

        // Refresh anything the assistant changed.
        if (actions.some(a => a.type === 'publication_added')) {
          void queryClient.invalidateQueries({ queryKey: ['publications'] });
        }
        if (actions.some(a => a.type === 'ticket_created')) {
          void queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
      } catch (error) {
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [messages, isSending, queryClient],
  );

  const clear = useCallback(() => setMessages([]), []);

  return { messages, isSending, send, clear };
}
