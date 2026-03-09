"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

interface ChatUser {
  id: string;
  username: string;
  avatar: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: ChatUser;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const url = initial ? "/api/chat" : `/api/chat${lastIdRef.current ? `?after=${lastIdRef.current}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data: Message[] = await res.json();
      if (data.length === 0) return;

      if (initial) {
        setMessages(data);
        lastIdRef.current = data[data.length - 1]?.id ?? null;
      } else {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const newOnes = data.filter((m) => !ids.has(m.id));
          if (newOnes.length === 0) return prev;
          lastIdRef.current = newOnes[newOnes.length - 1].id;
          return [...prev, ...newOnes];
        });
      }
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchMessages(true); }, [fetchMessages]);

  // Poll every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg: Message = await res.json();
        setMessages((prev) => [...prev, msg]);
        lastIdRef.current = msg.id;
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group consecutive messages from same user
  const grouped = messages.reduce<{ msg: Message; showHeader: boolean }[]>((acc, msg, i) => {
    const prev = messages[i - 1];
    const showHeader = !prev || prev.user.id !== msg.user.id ||
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;
    acc.push({ msg, showHeader });
    return acc;
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50 shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Group <span className="text-orange-500">Chat</span></h1>
              <p className="text-xs text-gray-500">Psyko Skrubs — {messages.length} messages loaded</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-1">
          {loading ? (
            <div className="space-y-4 pt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-800 rounded w-24" />
                    <div className="h-4 bg-gray-800 rounded w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No messages yet. Say something!</p>
            </div>
          ) : (
            grouped.map(({ msg, showHeader }) => (
              <div key={msg.id} className={showHeader ? "pt-4" : ""}>
                {showHeader && (
                  <div className="flex items-center gap-2 mb-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={msg.user.avatar} alt={msg.user.username} className="w-7 h-7 rounded-full border border-gray-700" />
                    <span className="text-sm font-bold text-white">{msg.user.username}</span>
                    <span className="text-xs text-gray-600">{formatTime(msg.createdAt)}</span>
                  </div>
                )}
                <div className="pl-9">
                  <p className={`text-sm leading-relaxed break-words ${msg.user.id === session?.user?.id ? "text-gray-200" : "text-gray-300"}`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-800/50 bg-[#0a0a0f] shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          {session ? (
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message the group... (Enter to send)"
                rows={1}
                maxLength={500}
                className="flex-1 bg-[#0d0d15] border border-gray-700 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none transition-colors"
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <a href="/api/auth/steam" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
                Sign in with Steam to chat
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
