"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageSquare,
  Star,
  Pencil,
  Trash2,
  Search,
  Menu,
  X,
  RefreshCcw,
} from "lucide-react";
import { useChat } from "@/react-app/hooks/useChat";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export default function Chat(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your AI assistant. I can help answer any questions you have, provide advice, explain topics, or just have a conversation. What would you like to know?",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const {
    sendMessage,
    loading,
    stop,
    conversationId,
    selectConversation,
    resetConversation,
  } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const streamingIdRef = useRef<string | null>(null);
  const loadedConvRef = useRef<number | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefsAuth, setPrefsAuth] = useState<boolean | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefs, setPrefs] = useState<{
    default_language: "" | "en" | "hi" | "hinglish";
    tone: "empathetic" | "coaching" | "formal" | "casual";
  }>({ default_language: "", tone: "empathetic" });
  const [conversations, setConversations] = useState<
    { id: number; title: string; updated_at: string; pinned?: boolean }[]
  >([]);
  const [searchQ, setSearchQ] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive helper to switch placeholder text
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const handle = (e: MediaQueryListEvent): void => {
      setIsMobile(e.matches);
    };
    setIsMobile(mq.matches);
    mq.addEventListener("change", handle);
    return () => {
      mq.removeEventListener("change", handle);
    };
  }, []);

  const savePrefs = async (): Promise<void> => {
    setPrefsSaving(true);
    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_language: prefs.default_language === "" ? null : prefs.default_language,
          tone: prefs.tone,
        }),
      });
    } finally {
      setPrefsSaving(false);
    }
  };

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mobile-only shorter greeting text mapping
  const DEFAULT_GREETING =
    "Hello! I'm your AI assistant. I can help answer any questions you have, provide advice, explain topics, or just have a conversation. What would you like to know?";
  const SHORT_GREETING_MOBILE = "Hi! I can help. What do you need?";

  useEffect(scrollToBottom, [messages]);

  // Cleanup on unmount: stop any in-flight request
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Prefill input from ?q= when navigating from Questions page
  useEffect(() => {
    const q = searchParams.get("q");
    if (q?.trim()) setInput(q);
  }, [searchParams]);

  // Load user preferences if authenticated
  useEffect(() => {
    let mounted = true;
    const load = async (): Promise<void> => {
      setPrefsLoading(true);
      try {
        const res = await fetch("/api/user/preferences");
        if (res.status === 401) {
          if (mounted) setPrefsAuth(false);
          return;
        }
        if (!res.ok) return;
        const data: unknown = await res.json();
        let p:
          | {
              default_language?: "en" | "hi" | "hinglish" | null;
              tone?: "empathetic" | "coaching" | "formal" | "casual";
            }
          | undefined;
        if (data && typeof data === "object" && "preferences" in data) {
          const pref = (data as { preferences?: unknown }).preferences;
          if (pref && typeof pref === "object") {
            const o = pref as Record<string, unknown>;
            const dl = o.default_language;
            const tn = o.tone;
            const default_language =
              dl === null || dl === "en" || dl === "hi" || dl === "hinglish"
                ? (dl)
                : undefined;
            const tone =
              tn === "empathetic" ||
              tn === "coaching" ||
              tn === "formal" ||
              tn === "casual"
                ? (tn)
                : undefined;
            p = { default_language, tone };
          }
        }
        if (!mounted) return;
        setPrefsAuth(true);
        setPrefs({
          default_language: p?.default_language ?? "",
          tone: p?.tone ?? "empathetic",
        });
      } finally {
        if (mounted) setPrefsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // Load persisted chat history once per conversation when authenticated
  useEffect(() => {
    const loadHistory = async (): Promise<void> => {
      if (!conversationId) return;
      if (loadedConvRef.current === conversationId) return;
      try {
        const res = await fetch(`/api/chat/${String(conversationId)}/messages`);
        if (!res.ok) return;
        const data: unknown = await res.json();
        const arr =
          data &&
          typeof data === "object" &&
          "messages" in data &&
          Array.isArray((data as { messages?: unknown }).messages)
            ? ((data as {
                messages: {
                  id: number;
                  role: string;
                  content: string;
                  created_at: string;
                }[];
              }).messages)
            : [];
        if (arr.length) {
          const mapped = arr.map((m) => ({
            id: String(m.id),
            content: m.content,
            role: m.role === "assistant" ? "assistant" : "user",
            timestamp: new Date(m.created_at),
          })) as Message[];
          setMessages(mapped);
        }
        loadedConvRef.current = conversationId;
      } catch (err) {
        console.warn("Failed to load conversation history", err);
      }
    };
    void loadHistory();
  }, [conversationId]);

  // Parse URL: /chat/[id] -> preselect conversation
  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    // path can be /chat or /chat/[id]
    const idx = parts.indexOf("chat");
    if (idx !== -1 && parts[idx + 1]) {
      const maybe = Number(parts[idx + 1]);
      if (!Number.isNaN(maybe) && maybe > 0 && conversationId !== maybe) {
        // Select the conversation; messages will be loaded by the existing effect
        selectConversation(maybe);
      }
    }
  }, [pathname, conversationId, selectConversation]);

  // Load conversations list if authenticated
  useEffect(() => {
    const loadConversations = async (): Promise<void> => {
      try {
        const qp = searchQ ? `?q=${encodeURIComponent(searchQ)}` : "";
        const res = await fetch(`/api/chat/conversations${qp}`);
        if (res.status === 401) return; // not logged in -> hide sidebar
        if (!res.ok) return;
        const data: unknown = await res.json();
        const list =
          data &&
          typeof data === "object" &&
          "conversations" in data &&
          Array.isArray((data as { conversations?: unknown }).conversations)
            ? ((data as {
                conversations: {
                  id: number;
                  title?: string;
                  updated_at?: string;
                  pinned?: boolean;
                }[];
              }).conversations)
            : [];
        setConversations(
          list.map((c) => ({
            id: c.id,
            title: String(c.title ?? "New chat"),
            updated_at: c.updated_at ?? "",
            pinned: !!c.pinned,
          })),
        );
      } catch (err) {
        console.warn("Failed to load conversations", err);
      }
    };
    void loadConversations();
    const t = setTimeout(() => { void loadConversations(); }, 0);
    return () => {
      clearTimeout(t);
    };
  }, [searchQ]);

  const refreshConversations = async (): Promise<void> => {
    try {
      const qp = searchQ ? `?q=${encodeURIComponent(searchQ)}` : "";
      const r = await fetch(`/api/chat/conversations${qp}`);
      if (!r.ok) return;
      const data: unknown = await r.json();
      const list =
        data &&
        typeof data === "object" &&
        "conversations" in data &&
        Array.isArray((data as { conversations?: unknown }).conversations)
          ? ((data as {
              conversations: {
                id: number;
                title?: string;
                updated_at?: string;
                pinned?: boolean;
              }[];
            }).conversations)
          : [];
      setConversations(
        list.map((c) => ({
          id: c.id,
          title: String(c.title ?? "New chat"),
          updated_at: c.updated_at ?? "",
          pinned: !!c.pinned,
        })),
      );
    } catch (err) {
      console.warn("Failed to refresh conversations", err);
    }
  };

  const openConversation = (id: number): void => {
    // Navigate to /chat/[id] and let effects load content, also reflect selection immediately
    router.push(`/chat/${String(id)}`);
    selectConversation(id);
    // Refresh list to reflect highlight (and potentially updated order)
    void refreshConversations();
    if (mobileSidebarOpen) setMobileSidebarOpen(false);
  };

  const newConversation = async (): Promise<void> => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      if (!res.ok) return;
      const jData: unknown = await res.json();
      const id =
        jData &&
        typeof jData === "object" &&
        "conversation" in jData &&
        jData.conversation &&
        typeof (jData as { conversation?: { id?: unknown } }).conversation ===
          "object"
          ? Number(
              (jData as { conversation?: { id?: unknown } }).conversation?.id,
            )
          : 0;
      if (id) {
        // Refresh conversation list
        try {
          const r = await fetch("/api/chat/conversations");
          if (r.ok) {
            const rData: unknown = await r.json();
            const list =
              rData &&
              typeof rData === "object" &&
              "conversations" in rData &&
              Array.isArray(
                (rData as { conversations?: unknown }).conversations,
              )
                ? ((rData as {
                    conversations: {
                      id: number;
                      title?: string;
                      updated_at?: string;
                      pinned?: boolean;
                    }[];
                  }).conversations)
                : [];
            setConversations(
              list.map((c) => ({
                id: c.id,
                title: String(c.title ?? "New chat"),
                updated_at: c.updated_at ?? "",
                pinned: !!c.pinned,
              })),
            );
          }
        } catch (err) {
          console.warn("Failed to refresh conversations after create", err);
        }
        router.push(`/chat/${String(id)}`);
        selectConversation(id);
      }
    } catch (err) {
      console.warn("Failed to create conversation", err);
    }
  };

  const renameConversation = async (id: number): Promise<void> => {
    const current = conversations.find((c) => c.id === id)?.title ?? "";
    const title = prompt("Rename chat", current);
    if (title === null) return;
    try {
      const res = await fetch(`/api/chat/conversations/${String(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) void refreshConversations();
    } catch (err) {
      console.warn("Failed to rename conversation", err);
    }
  };

  const togglePin = async (id: number): Promise<void> => {
    const conv = conversations.find((c) => c.id === id);
    const pinned = Boolean(conv?.pinned); // may not exist in local mapping; we can fetch fresh
    try {
      const res = await fetch(`/api/chat/conversations/${String(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !pinned }),
      });
      if (res.ok) void refreshConversations();
    } catch (err) {
      console.warn("Failed to toggle pin", err);
    }
  };

  const deleteConversation = async (id: number): Promise<void> => {
    const yes = confirm("Delete this chat? This cannot be undone.");
    if (!yes) return;
    try {
      const res = await fetch(`/api/chat/conversations/${String(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (conversationId === id) {
          router.push("/chat");
          resetConversation();
          // Clear messages to placeholder
          setMessages([
            {
              id: "1",
              content:
                "Hello! I'm your AI assistant. I can help answer any questions you have, provide advice, explain topics, or just have a conversation. What would you like to know?",
              role: "assistant",
              timestamp: new Date(),
            },
          ]);
        }
        void refreshConversations();
      }
    } catch (err) {
      console.warn("Failed to delete conversation", err);
    }
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      // Create an assistant placeholder and stream into it
      const assistantId = (Date.now() + 1).toString();
      streamingIdRef.current = assistantId;
      const emptyAssistant: Message = {
        id: assistantId,
        content: "",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, emptyAssistant]);

      const final = await sendMessage(input.trim(), {
        onToken: (t: string) => {
          const id = streamingIdRef.current;
          if (!id || !t) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, content: m.content + t } : m,
            ),
          );
        },
      });
      // Ensure final content is set (covers non-stream fallback)
      if (streamingIdRef.current) {
        const id = streamingIdRef.current;
        const text = (final || "").toString();
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== id) return m;
            const existing = (m.content || "").toString();
            if (text.trim().length > 0) {
              return { ...m, content: text };
            }
            // Only show fallback if NOTHING was streamed
            if (existing.trim().length === 0) {
              return {
                ...m,
                content:
                  "Sorry, I couldn't generate a response right now. Please try again.",
              };
            }
            // Preserve streamed content
            return m;
          }),
        );
      }
      streamingIdRef.current = null;
      // Refresh sidebar to reflect latest activity time
      void refreshConversations();
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleRegenerate = async (): Promise<void> => {
    if (loading) return;
    // Find last user message
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    try {
      const assistantId = (Date.now() + 1).toString();
      streamingIdRef.current = assistantId;
      const emptyAssistant: Message = {
        id: assistantId,
        content: "",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, emptyAssistant]);

      const final = await sendMessage(lastUser.content, {
        regenerate: true,
        onToken: (t: string) => {
          const id = streamingIdRef.current;
          if (!id || !t) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, content: m.content + t } : m,
            ),
          );
        },
      });
      if (streamingIdRef.current) {
        const id = streamingIdRef.current;
        const text = (final || "").toString();
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== id) return m;
            const existing = (m.content || "").toString();
            if (text.trim().length > 0) {
              return { ...m, content: text };
            }
            if (existing.trim().length === 0) {
              return {
                ...m,
                content:
                  "Sorry, I couldn't generate a response right now. Please try again.",
              };
            }
            return m;
          }),
        );
      }
      streamingIdRef.current = null;
    } catch (err) {
      console.warn("Failed to regenerate message", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 min-h-0">
      <div className="bg-white/10 border border-white/20 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 min-h-[80vh]">
        {/* Sidebar (ChatGPT-like) */}
        <aside className="hidden md:flex h-full flex-col bg-gradient-to-b from-purple-900/40 to-indigo-900/30">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80">Chats</span>
            <button
              onClick={() => { void newConversation(); }}
              className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg"
            >
              New
            </button>
          </div>
          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg">
              <Search className="w-4 h-4 text-white/60" />
              <input
                className="bg-transparent text-sm outline-none flex-1 text-white placeholder-white/50"
                placeholder="Search chats"
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-white/60 text-sm">No chats yet</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <div
                      className={`px-3 py-2.5 flex items-center gap-2 hover:bg-white/10 transition-colors ${conversationId === c.id ? "bg-white/10" : ""}`}
                    >
                      <button
                        onClick={() => {
                          openConversation(c.id);
                        }}
                        className="flex-1 text-left min-w-0"
                        title={c.title}
                      >
                        <div className="text-sm text-white truncate flex items-center gap-1">
                          {c.pinned ? (
                            <Star className="w-3.5 h-3.5 text-yellow-400" />
                          ) : null}
                          <span className="truncate">{c.title}</span>
                        </div>
                        <div className="text-[11px] text-white/50">
                          {c.updated_at
                            ? new Date(c.updated_at).toLocaleString()
                            : ""}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void togglePin(c.id);
                        }}
                        className="p-1.5 rounded hover:bg-white/10 text-white/70"
                        title={c.pinned ? "Unpin" : "Pin"}
                      >
                        {c.pinned ? (
                          <Star className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void renameConversation(c.id);
                        }}
                        className="p-1.5 rounded hover:bg-white/10 text-white/70"
                        title="Rename"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteConversation(c.id);
                        }}
                        className="p-1.5 rounded hover:bg-white/10 text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-3 border-t border-white/10">
            <button
              onClick={() => { void newConversation(); }}
              className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-lg text-sm"
            >
              + New Chat
            </button>
          </div>
        </aside>
        {/* Right Column */}
        <section className="flex flex-col min-h-[80vh]">
          {/* Header */}
          <div className="px-5 md:px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                onClick={() => { setMobileSidebarOpen((v) => !v); }}
                aria-label="Open chat list"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  AI Chat Assistant
                </h1>
                {/* Mobile-friendly alternate sentence */}
                <p className="md:hidden text-sm text-purple-200 leading-snug">
                  Ask anything. Quick, helpful answers
                </p>
                {/* Desktop original sentence retained */}
                <p className="hidden md:block text-lg text-purple-200">
                  Ask me anything - I'm here to help!
                </p>
              </div>
              <div className="ml-auto">
                {prefsAuth === true && (
                  <button
                    onClick={() => { setShowPrefs((v) => !v); }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                  >
                    {showPrefs ? "Close Preferences" : "Preferences"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preferences Panel */}
          {prefsAuth === true && showPrefs && (
            <div className="m-4 md:m-5 bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="block text-sm text-white/80 mb-1">
                    Default Language
                  </label>
                  <select
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    value={prefs.default_language}
                    onChange={(e) => {
                      setPrefs((prev) => ({
                        ...prev,
                        default_language: (e.target.value as "" | "en" | "hi" | "hinglish"),
                      }));
                    }}
                    disabled={prefsLoading || prefsSaving}
                  >
                    <option value="">Auto (mirror user)</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="hinglish">Hinglish</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-1">
                    Tone
                  </label>
                  <select
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    value={prefs.tone}
                    onChange={(e) => {
                      setPrefs((prev) => ({
                        ...prev,
                        tone: (e.target.value as "empathetic" | "coaching" | "formal" | "casual"),
                      }));
                    }}
                    disabled={prefsLoading || prefsSaving}
                  >
                    <option value="empathetic">Empathetic</option>
                    <option value="coaching">Coaching</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => { void savePrefs(); }}
                    disabled={prefsLoading || prefsSaving}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {prefsSaving ? "Saving…" : "Save Preferences"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chat Container */}
          <div className="flex-1 min-h-0 bg-transparent backdrop-blur-lg flex flex-col">
            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 space-y-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex items-start ${message.role === "user" ? "flex-row-reverse" : ""} gap-3 md:gap-4 max-w-[85%] md:max-w-2xl`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-purple-500 to-blue-600"
                          : "bg-gradient-to-br from-green-500 to-blue-500"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-purple-500 to-blue-600 text-white"
                          : "bg-white/20 text-white border border-white/20"
                      }`}
                    >
                      <div className="prose prose-invert max-w-none prose-p:my-2 prose-li:my-1 whitespace-pre-wrap leading-relaxed text-[15px]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {isMobile &&
                          message.role === "assistant" &&
                          message.content === DEFAULT_GREETING
                            ? SHORT_GREETING_MOBILE
                            : message.content}
                        </ReactMarkdown>
                      </div>
                      <div
                        className={`text-xs mt-2 ${
                          message.role === "user"
                            ? "text-white/80"
                            : "text-white/60"
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading Message */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white/20 text-white border border-white/20 rounded-xl px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-white/10 p-4 md:p-5">
              <div className="flex items-end gap-2.5 md:gap-3.5">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                  }}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    isMobile
                      ? "Message..."
                      : "Type your message here... (Press Enter to send)"
                  }
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/70 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-inner text-[15px] leading-6"
                  rows={1}
                  style={{ minHeight: "44px", maxHeight: "120px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${String(target.scrollHeight)}px`;
                  }}
                  disabled={loading}
                />
                <button
                  onClick={() => { void handleSendMessage(); }}
                  disabled={!input.trim() || loading}
                  className="h-12 w-12 grid place-items-center bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:from-purple-500/50 disabled:to-blue-600/50 text-white rounded-2xl transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
                {loading ? (
                  <button
                    onClick={stop}
                    className="h-12 px-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition-all duration-200"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => { void handleRegenerate(); }}
                    disabled={
                      messages.filter((m) => m.role === "user").length === 0
                    }
                    className="h-12 w-12 grid place-items-center bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all duration-200 disabled:opacity-50"
                    aria-label="Regenerate"
                    title="Regenerate"
                  >
                    <RefreshCcw className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Suggestions */}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {messages.length <= 1 && (
                  <>
                    <button
                      onClick={() => {
                        setInput(
                          "What are some effective goal-setting techniques?",
                        );
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                    >
                      Goal-setting tips
                    </button>
                    <button
                      onClick={() => {
                        setInput(
                          "How can I stay motivated to achieve my goals?",
                        );
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                    >
                      Motivation advice
                    </button>
                    <button
                      onClick={() => {
                        setInput("Explain the concept of compound interest");
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                    >
                      Learning topics
                    </button>
                    <button
                      onClick={() => {
                        setInput("What should I know about time management?");
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                    >
                      Productivity tips
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${mobileSidebarOpen ? "" : "pointer-events-none"}`}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${mobileSidebarOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => { setMobileSidebarOpen(false); }}
        />
        <div
          className={`absolute left-0 top-0 h-full w-[85%] max-w-[320px] bg-gradient-to-b from-purple-900/60 to-indigo-900/40 backdrop-blur-xl border-r border-white/20 shadow-2xl transform transition-transform ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80">Chats</span>
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg">
              <Search className="w-4 h-4 text-white/60" />
              <input
                className="bg-transparent text-sm outline-none flex-1 text-white placeholder-white/50"
                placeholder="Search chats"
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-white/60 text-sm">No chats yet</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <div
                      className={`px-3 py-2.5 flex items-center gap-2 hover:bg-white/10 transition-colors ${conversationId === c.id ? "bg-white/10" : ""}`}
                    >
                      <button
                        onClick={() => {
                          openConversation(c.id);
                        }}
                        className="flex-1 text-left min-w-0"
                        title={c.title}
                      >
                        <div className="text-sm text-white truncate flex items-center gap-1">
                          {c.pinned ? (
                            <Star className="w-3.5 h-3.5 text-yellow-400" />
                          ) : null}
                          <span className="truncate">{c.title}</span>
                        </div>
                        <div className="text-[11px] text-white/50">
                          {c.updated_at
                            ? new Date(c.updated_at).toLocaleString()
                            : ""}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void togglePin(c.id);
                        }}
                        className="p-1.5 rounded hover:bg-white/10 text-white/70"
                        title={c.pinned ? "Unpin" : "Pin"}
                      >
                        {c.pinned ? (
                          <Star className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void renameConversation(c.id);
                        }}
                        className="p-1.5 rounded hover:bg-white/10 text-white/70"
                        title="Rename"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteConversation(c.id);
                        }}
                        className="p-1.5 rounded hover:bg-white/10 text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-3 border-t border-white/10">
            <button
              onClick={() => { void newConversation(); }}
              className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-lg text-sm"
            >
              + New Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
