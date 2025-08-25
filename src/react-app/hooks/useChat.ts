import { useState } from 'react';
import toast from 'react-hot-toast';

export function useChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const resetConversation = () => setConversationId(null);

  const ensureConversation = async (): Promise<number | null> => {
    if (conversationId) return conversationId;
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      });
      if (res.status === 401) return null; // unauthenticated -> fall back to quick chat
      if (!res.ok) throw new Error('Failed to start conversation');
      const data = await res.json();
      const id: number | undefined = data?.conversation?.id;
      if (typeof id === 'number') {
        setConversationId(id);
        return id;
      }
      return null;
    } catch (e) {
      // Non-fatal: fall back to quick chat
      return null;
    }
  };

  const sendMessage = async (message: string): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      // Try persistent chat first (if authenticated)
      const convId = await ensureConversation();
      if (convId) {
        const res = await fetch(`/api/chat/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message }),
        });
        if (res.status === 401 || res.status === 403) {
          // Fall back to quick chat
        } else {
          if (!res.ok) throw new Error('Failed to send message');
          const data = await res.json();
          const reply: string | undefined = data?.response;
          if (typeof reply === 'string') return reply;
          throw new Error('Invalid response');
        }
      }

      // Quick chat fallback (no auth or failure): use /api/ai (Gemini-backed)
      const quick = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message }),
      });
      if (!quick.ok) throw new Error('Failed to send message');
      const data = await quick.json();
      return data.response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    sendMessage,
    conversationId,
    resetConversation,
  };
}
