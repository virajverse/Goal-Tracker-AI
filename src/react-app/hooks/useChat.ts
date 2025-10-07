import { useRef, useState } from "react";
import toast from "react-hot-toast";

interface QuickAIResponse {
  response?: unknown;
  error?: unknown;
}

interface ConversationResponse {
  conversation?: { id?: unknown } | null;
  error?: unknown;
}

interface SendOptions {
  onToken?: (t: string) => void;
  regenerate?: boolean;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string") return err;
  }
  return fallback;
}

function extractReply(data: unknown): string | null {
  if (data && typeof data === "object" && "response" in data) {
    const r = (data as QuickAIResponse).response;
    if (typeof r === "string") return r;
  }
  return null;
}

function extractConversationId(data: unknown): number | null {
  if (data && typeof data === "object" && "conversation" in data) {
    const conv = (data as ConversationResponse).conversation;
    const id = conv && typeof conv === "object" ? (conv as { id?: unknown }).id : undefined;
    if (typeof id === "number") return id;
  }
  return null;
}

export function useChat(): {
  loading: boolean;
  error: string | null;
  sendMessage: (message: string, options?: SendOptions) => Promise<string>;
  conversationId: number | null;
  resetConversation: () => void;
  stop: () => void;
  selectConversation: (id: number) => void;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const resetConversation = (): void => {
    setConversationId(null);
  };

  const selectConversation = (id: number): void => {
    setConversationId(id);
  };

  const ensureConversation = async (): Promise<number | null> => {
    if (conversationId) return conversationId;
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      if (res.status === 401) return null; // unauthenticated -> fall back to quick chat
      if (!res.ok) {
        let j: unknown = null;
        try { j = await res.json(); } catch {}
        const msg = extractErrorMessage(j, "Failed to start conversation");
        throw new Error(msg);
      }
      let data: unknown = null;
      try { data = await res.json(); } catch {}
      const id = extractConversationId(data);
      if (typeof id === "number") {
        setConversationId(id);
        return id;
      }
      return null;
    } catch {
      // Non-fatal: fall back to quick chat
      return null;
    }
  };

  const sendMessage = async (message: string, options?: SendOptions): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      // Cancel any previous in-flight request
      if (controllerRef.current) {
        try { controllerRef.current.abort(); } catch {}
      }
      controllerRef.current = new AbortController();
      const signal = controllerRef.current.signal;

      // 1) Try persistent chat (stream)
      const convId = await ensureConversation();
      if (convId) {
        try {
          const res = await fetch(`/api/chat/${String(convId)}/messages/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: message, regenerate: !!options?.regenerate }),
            signal,
          });
          if (res.status !== 401 && res.status !== 403) {
            if (!res.ok || !res.body) throw new Error("Streaming not available");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let full = "";
            for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
              buffer += decoder.decode(chunk.value, { stream: true });
              let idx = buffer.indexOf("\n\n");
              let sep = 2;
              if (idx === -1) {
                const crlf = buffer.indexOf("\r\n\r\n");
                if (crlf !== -1) {
                  idx = crlf;
                  sep = 4;
                }
              }
              while (idx !== -1) {
                const evt = buffer.slice(0, idx);
                buffer = buffer.slice(idx + sep);
                if (evt.startsWith("event: done")) {
                  try { reader.cancel(); } catch {}
                  buffer = "";
                  break;
                }
                const lines = evt.split(/\r?\n/);
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const piece = line.slice(6);
                    full += piece;
                    if (piece) options?.onToken?.(piece);
                  }
                }
                idx = buffer.indexOf("\n\n");
                sep = 2;
                if (idx === -1) {
                  const crlf2 = buffer.indexOf("\r\n\r\n");
                  if (crlf2 !== -1) {
                    idx = crlf2;
                    sep = 4;
                  }
                }
              }
            }
            const text = full.trim();
            if (text.length > 0) return text;
            // Continue to fallback below
          }
        } catch {
          if (signal.aborted) {
            // aborted: continue to non-stream/quick fallbacks below
          }
          // 2) Persistent chat (non-stream JSON)
          try {
            const res2 = await fetch(`/api/chat/${String(convId)}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: message, regenerate: !!options?.regenerate }),
              signal,
            });
            if (res2.ok) {
              let data2: unknown = null;
              try { data2 = await res2.json(); } catch {}
              if (data2 && typeof data2 === "object" && "response" in data2) {
                const r = (data2 as { response?: unknown }).response;
                if (typeof r === "string" && r) {
                  options?.onToken?.(r);
                  return r;
                }
              }
            }
          } catch { /* ignore */ }
        }
      }

      // 3) Quick chat (JSON first)
      try {
        const quick = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: message }),
        });
        if (quick.ok) {
          let data: unknown = null;
          try { data = await quick.json(); } catch {}
          const reply = extractReply(data);
          if (typeof reply === "string") {
            if (reply) options?.onToken?.(reply);
            return reply;
          }
        }
      } catch { /* ignore and try stream */ }

      // 4) Quick chat (stream fallback)
      try {
        const res = await fetch("/api/ai/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: message }),
          signal,
        });
        if (!res.ok || !res.body) throw new Error("Streaming not available");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
          buffer += decoder.decode(chunk.value, { stream: true });
          let idx = buffer.indexOf("\n\n");
          let sep = 2;
          if (idx === -1) {
            const crlf = buffer.indexOf("\r\n\r\n");
            if (crlf !== -1) {
              idx = crlf;
              sep = 4;
            }
          }
          while (idx !== -1) {
            const evt = buffer.slice(0, idx);
            buffer = buffer.slice(idx + sep);
            if (evt.startsWith("event: done")) {
              break;
            }
            const lines = evt.split(/\r?\n/);
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const piece = line.slice(6);
                full += piece;
                if (piece) options?.onToken?.(piece);
              }
            }
            idx = buffer.indexOf("\n\n");
            sep = 2;
            if (idx === -1) {
              const crlf2 = buffer.indexOf("\r\n\r\n");
              if (crlf2 !== -1) {
                idx = crlf2;
                sep = 4;
              }
            }
          }
        }
        const text = full.trim();
        if (text.length > 0) return text;
        throw new Error("Empty stream");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to send message";
        throw new Error(msg);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const stop = (): void => {
    if (controllerRef.current) {
      try { controllerRef.current.abort(); } catch {}
      controllerRef.current = null;
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    sendMessage,
    conversationId,
    resetConversation,
    stop,
    selectConversation,
  };
}
