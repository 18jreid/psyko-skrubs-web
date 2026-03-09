"use client";

import { useState } from "react";
import Image from "next/image";

interface Rsvp {
  id: string;
  userId: string;
  status: string;
  user: { id: string; username: string; avatar: string };
}

interface GameSession {
  id: string;
  title: string;
  game: string;
  scheduledAt: string;
  createdAt: string;
  createdBy: { id: string; username: string; avatar: string };
  rsvps: Rsvp[];
}

interface Props {
  initialSessions: GameSession[];
  userId: string | null;
  userName: string | null;
}

const GAMES = ["CS2", "Valorant", "Apex Legends", "Fortnite", "Other"];

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const isPast = diff < 0;
  const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const relStr = isPast ? "Past" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  return { dateStr, timeStr, relStr, isPast };
}

export default function SessionsClient({ initialSessions, userId, userName }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("CS2");
  const [scheduledAt, setScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  const upcoming = sessions.filter((s) => new Date(s.scheduledAt) >= new Date());
  const past = sessions.filter((s) => new Date(s.scheduledAt) < new Date());

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;
    setCreating(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, game, scheduledAt }),
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions((prev) => [newSession, ...prev].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()));
        setTitle("");
        setScheduledAt("");
        setShowCreate(false);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRsvp(sessionId: string, status: string) {
    if (!userId) return;
    setRsvpLoading(sessionId + status);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            const filtered = s.rsvps.filter((r) => r.userId !== userId);
            const myRsvp = { id: "tmp", userId: userId!, status, user: { id: userId!, username: userName ?? "", avatar: "" } };
            return { ...s, rsvps: [...filtered, myRsvp], inCount: data.inCount, outCount: data.outCount, maybeCount: data.maybeCount };
          })
        );
      }
    } finally {
      setRsvpLoading(null);
    }
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-gray-500 text-sm">{upcoming.length} upcoming · {past.length} past</p>
        {userId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Schedule Session
          </button>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-black text-white mb-5">Schedule a Session</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Friday Night Ranked..."
                  className="w-full bg-[#0a0a0f] border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Game</label>
                <select
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50 text-sm"
                >
                  {GAMES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50 text-sm"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm">
                  {creating ? "Scheduling..." : "Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      {upcoming.length === 0 && past.length === 0 ? (
        <div className="text-center py-20 bg-[#0d0d15] border border-gray-800 rounded-2xl">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-400 font-semibold mb-2">No sessions yet</p>
          <p className="text-gray-600 text-sm">{userId ? "Schedule the first one!" : "Sign in to schedule a session."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((s) => <SessionCard key={s.id} session={s} userId={userId} onRsvp={handleRsvp} rsvpLoading={rsvpLoading} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Past</h2>
              <div className="space-y-3 opacity-60">
                {past.map((s) => <SessionCard key={s.id} session={s} userId={userId} onRsvp={handleRsvp} rsvpLoading={rsvpLoading} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, userId, onRsvp, rsvpLoading }: {
  session: GameSession & { inCount?: number; outCount?: number; maybeCount?: number };
  userId: string | null;
  onRsvp: (id: string, status: string) => void;
  rsvpLoading: string | null;
}) {
  const { dateStr, timeStr, relStr, isPast } = formatDate(session.scheduledAt);
  const myRsvp = userId ? session.rsvps.find((r) => r.userId === userId)?.status ?? null : null;
  const inCount = session.inCount ?? session.rsvps.filter((r) => r.status === "in").length;
  const outCount = session.outCount ?? session.rsvps.filter((r) => r.status === "out").length;
  const maybeCount = session.maybeCount ?? session.rsvps.filter((r) => r.status === "maybe").length;

  return (
    <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-5 hover:border-orange-500/20 transition-colors">
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="shrink-0 bg-[#0a0a0f] border border-gray-800 rounded-xl p-3 text-center min-w-[64px]">
          <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">{relStr}</p>
          <p className="text-white font-black text-lg leading-tight">{new Date(session.scheduledAt).getDate()}</p>
          <p className="text-[10px] text-gray-500">{new Date(session.scheduledAt).toLocaleString("en-US", { month: "short" })}</p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-white text-lg">{session.title}</h3>
            <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-400 font-bold">{session.game}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{dateStr} at {timeStr}</p>
          <div className="flex items-center gap-2 mt-2">
            <Image src={session.createdBy.avatar} alt={session.createdBy.username} width={16} height={16} className="rounded-full" />
            <span className="text-xs text-gray-600">by {session.createdBy.username}</span>
          </div>
        </div>

        {/* RSVP counts */}
        <div className="shrink-0 flex gap-3 text-center">
          <div>
            <p className="text-green-400 font-black text-lg leading-none">{inCount}</p>
            <p className="text-[10px] text-gray-600">In</p>
          </div>
          <div>
            <p className="text-yellow-400 font-black text-lg leading-none">{maybeCount}</p>
            <p className="text-[10px] text-gray-600">Maybe</p>
          </div>
          <div>
            <p className="text-red-400 font-black text-lg leading-none">{outCount}</p>
            <p className="text-[10px] text-gray-600">Out</p>
          </div>
        </div>
      </div>

      {/* RSVP buttons */}
      {userId && !isPast && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
          {(["in", "maybe", "out"] as const).map((status) => {
            const active = myRsvp === status;
            const loading = rsvpLoading === session.id + status;
            const colors = { in: "bg-green-500/20 border-green-500/40 text-green-400", maybe: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400", out: "bg-red-500/20 border-red-500/40 text-red-400" };
            const labels = { in: "I'm In", maybe: "Maybe", out: "Can't Make It" };
            return (
              <button
                key={status}
                onClick={() => onRsvp(session.id, status)}
                disabled={loading}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${active ? colors[status] : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400"}`}
              >
                {loading ? "..." : labels[status]}
              </button>
            );
          })}
        </div>
      )}

      {/* RSVP avatars */}
      {session.rsvps.filter((r) => r.status === "in").length > 0 && (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex -space-x-2">
            {session.rsvps.filter((r) => r.status === "in").slice(0, 8).map((r) => (
              r.user.avatar ? <Image key={r.id} src={r.user.avatar} alt={r.user.username} width={24} height={24} className="rounded-full border-2 border-[#0d0d15]" /> : null
            ))}
          </div>
          <span className="text-xs text-gray-600">{session.rsvps.filter((r) => r.status === "in").map((r) => r.user.username).join(", ")} going</span>
        </div>
      )}
    </div>
  );
}
