"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface FeatureVote {
  userId: string;
  value: number;
}

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  status: string;
  score: number;
  createdAt: string;
  votes: FeatureVote[];
  user: { id: string; username: string; avatar: string };
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  planned: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "in-progress": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  done: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function FeatureRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/feature-requests");
      if (res.ok) setRequests(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        setShowModal(false);
        setTitle("");
        setDescription("");
        fetchRequests();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to submit");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string, value: 1 | -1) => {
    if (!session) return;
    setVotingId(id);
    try {
      const res = await fetch(`/api/feature-requests/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        const { score, votes } = await res.json();
        setRequests((prev) =>
          [...prev.map((r) => r.id === id ? { ...r, score, votes } : r)]
            .sort((a, b) => b.score - a.score)
        );
      }
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">
                Feature{" "}
                <span className="text-orange-500">Requests</span>
              </h1>
              <p className="text-gray-500 mt-1">
                Suggest and vote on things you want added to the site
              </p>
            </div>
            <button
              onClick={() => session ? setShowModal(true) : window.location.href = "/api/auth/steam"}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-900/30 self-start sm:self-auto shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Request a Feature
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#0d0d15] border border-gray-800 rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((req) => {
              const myVote = req.votes.find((v) => v.userId === session?.user?.id)?.value ?? 0;
              return (
                <div
                  key={req.id}
                  className="bg-[#0d0d15] border border-gray-800 rounded-xl p-4 flex gap-4 hover:border-gray-700 transition-colors"
                >
                  {/* Vote column */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleVote(req.id, 1)}
                      disabled={!session || votingId === req.id}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        myVote === 1
                          ? "bg-orange-500 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 14l5-5 5 5H7z" />
                      </svg>
                    </button>
                    <span className={`text-sm font-black tabular-nums ${
                      req.score > 0 ? "text-orange-400" : req.score < 0 ? "text-red-400" : "text-gray-500"
                    }`}>
                      {req.score}
                    </span>
                    <button
                      onClick={() => handleVote(req.id, -1)}
                      disabled={!session || votingId === req.id}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        myVote === -1
                          ? "bg-red-500/80 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 10l5 5 5-5H7z" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2 mb-1">
                      <p className="font-semibold text-white">{req.title}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[req.status] ?? STATUS_STYLES.open}`}>
                        {req.status}
                      </span>
                    </div>
                    {req.description && (
                      <p className="text-sm text-gray-400 leading-relaxed mb-2">{req.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <img
                        src={req.user.avatar}
                        alt={req.user.username}
                        className="w-4 h-4 rounded-full"
                      />
                      <span>{req.user.username}</span>
                      <span>·</span>
                      <span>{relativeDate(req.createdAt)}</span>
                      <span>·</span>
                      <span>{req.votes.length} vote{req.votes.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">No requests yet</h3>
            <p className="text-gray-600 mb-6">Be the first to suggest something!</p>
            <button
              onClick={() => session ? setShowModal(true) : window.location.href = "/api/auth/steam"}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
            >
              Request a Feature
            </button>
          </div>
        )}

        {!session && requests.length > 0 && (
          <p className="text-center text-xs text-gray-600 mt-8">
            <a href="/api/auth/steam" className="text-orange-400 hover:text-orange-300 transition-colors">Sign in with Steam</a> to submit and vote on requests
          </p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Request a Feature</h3>
            <p className="text-sm text-gray-400 mb-5">What would you like to see added to the site?</p>

            <div className="space-y-3 mb-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Feature title (e.g. Show headshot percentage)"
                maxLength={120}
                className="w-full bg-[#0a0a0f] border border-gray-700 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: describe what you have in mind..."
                rows={3}
                maxLength={500}
                className="w-full bg-[#0a0a0f] border border-gray-700 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); setError(""); setTitle(""); setDescription(""); }}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !title.trim()}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
