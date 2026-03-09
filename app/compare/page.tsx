"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface User {
  id: string;
  username: string;
  avatar: string;
  steamId: string;
}

interface Stats {
  kd_ratio: number;
  total_kills: number;
  total_deaths: number;
  total_wins: number;
  hours_played: number;
}

interface PlayerData {
  id: string;
  username: string;
  avatar: string;
  cs2Elo: number | null;
  stats: Stats | null;
}

interface CompareResult {
  a: PlayerData;
  b: PlayerData;
}

function statRows(a: Stats | null, b: Stats | null, aElo: number | null, bElo: number | null) {
  const rows = [
    { label: "K/D Ratio", aVal: a?.kd_ratio?.toFixed(2) ?? "—", bVal: b?.kd_ratio?.toFixed(2) ?? "—", aRaw: a?.kd_ratio ?? -1, bRaw: b?.kd_ratio ?? -1 },
    { label: "Total Kills", aVal: a?.total_kills?.toLocaleString() ?? "—", bVal: b?.total_kills?.toLocaleString() ?? "—", aRaw: a?.total_kills ?? -1, bRaw: b?.total_kills ?? -1 },
    { label: "Total Deaths", aVal: a?.total_deaths?.toLocaleString() ?? "—", bVal: b?.total_deaths?.toLocaleString() ?? "—", aRaw: a?.total_deaths ?? -1, bRaw: b?.total_deaths ?? -1, lowerIsBetter: true },
    { label: "Total Wins", aVal: a?.total_wins?.toLocaleString() ?? "—", bVal: b?.total_wins?.toLocaleString() ?? "—", aRaw: a?.total_wins ?? -1, bRaw: b?.total_wins ?? -1 },
    { label: "Hours Played", aVal: a ? `${a.hours_played.toLocaleString()}h` : "—", bVal: b ? `${b.hours_played.toLocaleString()}h` : "—", aRaw: a?.hours_played ?? -1, bRaw: b?.hours_played ?? -1 },
    { label: "Premier ELO", aVal: aElo?.toLocaleString() ?? "—", bVal: bElo?.toLocaleString() ?? "—", aRaw: aElo ?? -1, bRaw: bElo ?? -1 },
  ];
  return rows;
}

export default function ComparePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!aId || !bId || aId === bId) { setResult(null); return; }
    setLoading(true);
    fetch(`/api/compare?a=${aId}&b=${bId}`)
      .then((r) => r.json())
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [aId, bId]);

  const rows = result ? statRows(result.a.stats, result.b.stats, result.a.cs2Elo, result.b.cs2Elo) : [];

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-black text-white">
            Head-to-<span className="text-orange-500">Head</span>
          </h1>
          <p className="text-gray-500 mt-1">Compare CS2 stats between two players</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Player selectors */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[{ label: "Player 1", val: aId, set: setAId }, { label: "Player 2", val: bId, set: setBId }].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{label}</label>
              <select
                value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full bg-[#0d0d15] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 text-sm"
              >
                <option value="">Select a player...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && result && (
          <div>
            {/* Player headers */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[result.a, result.b].map((p, i) => (
                <div key={p.id} className={`flex flex-col items-center gap-2 ${i === 1 ? "col-start-3" : ""}`}>
                  <Image src={p.avatar} alt={p.username} width={56} height={56} className="rounded-full border-2 border-orange-500/40" />
                  <p className="font-black text-white text-center">{p.username}</p>
                  {p.stats ? (
                    <span className="text-xs text-green-400 font-semibold">Stats available</span>
                  ) : (
                    <span className="text-xs text-gray-600">Private profile</span>
                  )}
                </div>
              ))}
            </div>

            {/* Stat table */}
            <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl overflow-hidden">
              {rows.map((row, i) => {
                const aWins = row.lowerIsBetter ? row.aRaw < row.bRaw : row.aRaw > row.bRaw;
                const bWins = row.lowerIsBetter ? row.bRaw < row.aRaw : row.bRaw > row.aRaw;
                const tied = row.aRaw === row.bRaw || row.aRaw === -1 || row.bRaw === -1;
                return (
                  <div key={row.label} className={`grid grid-cols-3 items-center px-6 py-4 ${i < rows.length - 1 ? "border-b border-gray-800/60" : ""}`}>
                    <p className={`text-lg font-black text-right ${!tied && aWins ? "text-orange-400" : "text-gray-300"}`}>{row.aVal}</p>
                    <p className="text-xs text-gray-500 text-center uppercase tracking-wider">{row.label}</p>
                    <p className={`text-lg font-black text-left ${!tied && bWins ? "text-orange-400" : "text-gray-300"}`}>{row.bVal}</p>
                  </div>
                );
              })}
            </div>

            {/* Winner banner */}
            {(() => {
              let aPoints = 0, bPoints = 0;
              for (const row of rows) {
                if (row.aRaw === -1 || row.bRaw === -1 || row.aRaw === row.bRaw) continue;
                const aWins = row.lowerIsBetter ? row.aRaw < row.bRaw : row.aRaw > row.bRaw;
                if (aWins) aPoints++; else bPoints++;
              }
              if (aPoints === bPoints) return null;
              const winner = aPoints > bPoints ? result.a : result.b;
              return (
                <div className="mt-4 flex items-center justify-center gap-3 py-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                  <span className="text-2xl">🏆</span>
                  <p className="font-black text-white"><span className="text-orange-400">{winner.username}</span> wins the head-to-head</p>
                  <span className="text-2xl">🏆</span>
                </div>
              );
            })()}
          </div>
        )}

        {!loading && !result && aId && bId && aId !== bId && (
          <p className="text-center text-gray-600 py-16">Could not load comparison.</p>
        )}

        {!aId || !bId ? (
          <div className="text-center py-16 bg-[#0d0d15] border border-gray-800 rounded-2xl">
            <p className="text-gray-500">Select two players above to compare their stats</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
