"use client";

import { useState } from "react";

interface Props {
  isLinked: boolean;
  todayEarned: number;
  dailyCap: number;
  recentRewards: { coins: number; minutes: number; awardedAt: string }[];
}

function DiscordIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function DiscordSection({ isLinked: initialLinked, todayEarned, dailyCap, recentRewards }: Props) {
  const [isLinked, setIsLinked] = useState(initialLinked);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progressPct = Math.min(100, (todayEarned / dailyCap) * 100);

  async function generateCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/discord/generate-link", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        if (data.error === "Discord already linked") {
          setIsLinked(true);
        } else {
          setError(data.error);
        }
      } else {
        setCode(data.code);
        setExpiresAt(data.expiresAt);
      }
    } catch {
      setError("Failed to generate code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section>
      <h2 className="text-lg font-black text-white mb-4">Discord Rewards</h2>
      <div className="bg-[#0d0d15] border border-gray-800 rounded-xl p-5 space-y-4">

        {isLinked ? (
          <>
            {/* Linked state */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5865f2]/20 flex items-center justify-center text-[#5865f2]">
                <DiscordIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Discord Linked</p>
                <p className="text-xs text-gray-500">Earning 100 coins every 20 min in voice chat</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-400 font-medium">Active</span>
              </div>
            </div>

            {/* Daily progress */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Today&apos;s earnings</span>
                <span className="text-orange-400 font-bold">{todayEarned} / {dailyCap} coins</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {todayEarned >= dailyCap && (
                <p className="text-xs text-orange-400 mt-1.5">Daily cap reached — resets at midnight UTC</p>
              )}
            </div>

            {/* Recent rewards */}
            {recentRewards.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-2">Recent Awards</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {recentRewards.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        +{r.coins} coins <span className="text-gray-600">· {r.minutes} min in voice</span>
                      </span>
                      <span className="text-gray-600">
                        {new Date(r.awardedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Unlinked state */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5865f2]/10 flex items-center justify-center text-[#5865f2] shrink-0 mt-0.5">
                <DiscordIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Link your Discord</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Earn <span className="text-orange-400 font-bold">100 coins every 20 minutes</span> you spend in the Psyko Skrubs voice channels.
                  Up to <span className="text-orange-400 font-bold">500 coins/day</span>.
                </p>
              </div>
            </div>

            {!code ? (
              <div className="space-y-2">
                <button
                  onClick={generateCode}
                  disabled={loading}
                  className="w-full py-2.5 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <DiscordIcon />
                  {loading ? "Generating..." : "Generate Link Code"}
                </button>
                {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              </div>
            ) : (
              <div className="bg-[#0a0a0f] border border-orange-500/20 rounded-lg p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Your link code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-black text-orange-400 tracking-[0.3em]">{code}</span>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  In the Psyko Skrubs Discord, run:
                </p>
                <div className="bg-[#1a1a2e] rounded-md px-3 py-2 font-mono text-sm text-white text-center select-all">
                  /link {code}
                </div>
                <p className="text-xs text-gray-600 text-center">
                  Expires at {expiryLabel} · 10-minute window
                </p>
                <button
                  onClick={generateCode}
                  disabled={loading}
                  className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Generate new code
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { label: "Per 20 min", value: "100 coins" },
                { label: "Daily cap", value: "500 coins" },
                { label: "Per hour", value: "300 coins" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-orange-400 font-black text-sm">{value}</p>
                  <p className="text-xs text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
