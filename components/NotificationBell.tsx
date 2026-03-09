"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  refId: string | null;
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const poll = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) setNotifications(await res.json());
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
    const unread = notifications.filter((n) => !n.read);
    if (unread.length > 0) {
      await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  if (status !== "authenticated") return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-[10px] font-black text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0d0d15] border border-gray-800 rounded-2xl shadow-xl shadow-black/50 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-sm font-black text-white">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-800/50 last:border-0 ${!n.read ? "bg-orange-500/5" : ""}`}
                >
                  <div className="flex gap-2 items-start">
                    <span className="text-base shrink-0 mt-0.5">{n.type === "achievement" ? "🏆" : "📅"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{relativeDate(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
