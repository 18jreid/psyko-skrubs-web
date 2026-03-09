"use client";

import { useState, useEffect } from "react";
import { detectPlatform } from "@/lib/steam";

interface ClipModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClipModal({ onClose, onSuccess }: ClipModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (url) {
      setPlatform(detectPlatform(url));
    } else {
      setPlatform("");
    }
  }, [url]);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      setError("Title and URL are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), url: url.trim(), description: description.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to post clip");
        return;
      }

      onSuccess();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const platformLabels: Record<string, { label: string; color: string }> = {
    youtube: { label: "YouTube", color: "text-red-400" },
    streamable: { label: "Streamable", color: "text-blue-400" },
    medal: { label: "Medal.tv", color: "text-yellow-400" },
    other: { label: "Other", color: "text-gray-400" },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#0d0d15] border border-gray-700 rounded-2xl shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Post a Clip</h2>
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
              Clip URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/60 transition-colors"
              required
            />
            {platform && platformLabels[platform] && (
              <p className={`mt-1 text-xs ${platformLabels[platform].color}`}>
                Detected: {platformLabels[platform].label}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My insane ace on Dust2..."
              className="w-full px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500/60 transition-colors"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened in this clip?"
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
              {loading ? "Posting..." : "Post Clip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
