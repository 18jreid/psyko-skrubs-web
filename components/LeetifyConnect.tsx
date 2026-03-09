"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeetifyConnect({ hasToken }: { hasToken: boolean }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/leetify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect");
      } else {
        setOpen(false);
        setToken("");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch("/api/user/leetify-token", { method: "DELETE" });
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {hasToken && (
          <button
            onClick={handleDisconnect}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        )}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] hover:bg-[#252540] border border-orange-500/30 hover:border-orange-500/60 text-orange-400 text-xs font-semibold rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {hasToken ? "Reconnect Leetify" : "Connect Leetify"}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Connect Leetify</h3>
            <p className="text-sm text-gray-400 mb-5">
              Paste your Leetify access token to pull your stats automatically.
            </p>

            <div className="bg-[#0a0a0f] border border-gray-800 rounded-xl p-4 mb-5 space-y-2">
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">How to get your token</p>
              <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>Go to <a href="https://leetify.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">leetify.com</a> and sign in</li>
                <li>Open DevTools (F12 or right-click → Inspect)</li>
                <li>Go to the <strong className="text-gray-300">Console</strong> tab</li>
                <li>Paste and run: <code className="bg-gray-800 px-1 rounded text-orange-300">localStorage.getItem("access_token")</code></li>
                <li>Copy the quoted string and paste it below</li>
              </ol>
            </div>

            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder='Paste your token here (the long string starting with "eyJ...")'
              rows={3}
              className="w-full bg-[#0a0a0f] border border-gray-700 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none font-mono mb-3 transition-colors"
            />

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setError(""); setToken(""); }}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !token.trim()}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {loading ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
