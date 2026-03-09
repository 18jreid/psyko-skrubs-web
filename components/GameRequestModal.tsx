"use client";

import { useState, useEffect } from "react";

interface GameRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function GameRequestModal({
  onClose,
  onSuccess,
}: GameRequestModalProps) {
  const [steamAppId, setSteamAppId] = useState("");
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steamAppId.trim() || !gameName.trim()) {
      setError("Steam App ID and game name are required");
      return;
    }

    if (isNaN(Number(steamAppId))) {
      setError("Steam App ID must be a number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/games/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steamAppId: steamAppId.trim(),
          gameName: gameName.trim(),
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create request");
        return;
      }

      onSuccess();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#0d0d15] border border-gray-700 rounded-2xl shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Request a Game</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Steam App ID *
            </label>
            <input
              type="text"
              value={steamAppId}
              onChange={(e) => setSteamAppId(e.target.value)}
              placeholder="e.g. 730 (CS2), 570 (Dota 2)"
              className="w-full px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/60 transition-colors"
              required
            />
            <p className="mt-1 text-xs text-gray-600">
              Find the App ID in the Steam store URL:{" "}
              <span className="text-gray-500">store.steampowered.com/app/[ID]</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Game Name *
            </label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Counter-Strike 2"
              className="w-full px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/60 transition-colors"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Why should we play it?{" "}
              <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="It's got great coop, perfect for the group..."
              rows={3}
              className="w-full px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/60 transition-colors resize-none"
              maxLength={300}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {loading ? "Requesting..." : "Request Game"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
