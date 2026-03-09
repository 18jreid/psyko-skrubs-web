"use client";

import Image from "next/image";
import { useState } from "react";

interface CS2Stats {
  total_kills: number;
  total_deaths: number;
  total_wins: number;
  total_time_played: number;
  kd_ratio: number;
  hours_played: number;
}

interface Player {
  id: string;
  steamId: string;
  username: string;
  avatar: string;
  profileUrl: string;
  stats: CS2Stats | null;
  isPrivate: boolean;
}

interface RankingsTableProps {
  initialPlayers: Player[];
}

type SortKey = "kd_ratio" | "total_wins" | "hours_played" | "total_kills";

function kdColor(kd: number): string {
  if (kd >= 1.5) return "text-green-400";
  if (kd >= 1.0) return "text-yellow-400";
  return "text-red-400";
}

export default function RankingsTable({ initialPlayers }: RankingsTableProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const [sortBy, setSortBy] = useState<SortKey>("kd_ratio");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/rankings", { cache: "no-store" });
      if (res.ok) setPlayers(await res.json());
    } catch (err) {
      console.error("Error refreshing rankings:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const sorted = [...players].sort((a, b) => {
    if (a.isPrivate && !b.isPrivate) return 1;
    if (!a.isPrivate && b.isPrivate) return -1;
    if (!a.stats || !b.stats) return 0;

    if (sortBy === "kd_ratio") return b.stats.kd_ratio - a.stats.kd_ratio;
    if (sortBy === "total_wins") return b.stats.total_wins - a.stats.total_wins;
    if (sortBy === "hours_played") return b.stats.hours_played - a.stats.hours_played;
    if (sortBy === "total_kills") return b.stats.total_kills - a.stats.total_kills;
    return 0;
  });

  const SortBtn = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => setSortBy(field)}
      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
        sortBy === field
          ? "bg-orange-500 text-white"
          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 mr-1">Sort by:</span>
          <SortBtn label="K/D Ratio" field="kd_ratio" />
          <SortBtn label="Total Wins" field="total_wins" />
          <SortBtn label="Hours Played" field="hours_played" />
          <SortBtn label="Total Kills" field="total_kills" />
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh Stats"}
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl overflow-hidden border border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0d0d15] border-b border-gray-800">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-orange-500/80 uppercase tracking-wider">
                K/D
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Kills
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Deaths
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Wins
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Hours
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {sorted.map((player, index) => (
              <tr
                key={player.id}
                className="bg-[#0a0a0f] hover:bg-[#0d0d18] transition-colors"
              >
                <td className="px-4 py-4">
                  <RankBadge rank={index + 1} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={player.avatar}
                      alt={player.username}
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-gray-700"
                    />
                    <div>
                      <a
                        href={player.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-white hover:text-orange-400 transition-colors"
                      >
                        {player.username}
                      </a>
                      {player.isPrivate && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          Private profile
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  {player.stats ? (
                    <span
                      className={`font-black text-lg ${kdColor(player.stats.kd_ratio)}`}
                    >
                      {player.stats.kd_ratio.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {player.stats ? (
                    <span className="text-gray-300 font-medium">
                      {player.stats.total_kills.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {player.stats ? (
                    <span className="text-gray-400">
                      {player.stats.total_deaths.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {player.stats ? (
                    <span className="text-gray-300 font-medium">
                      {player.stats.total_wins.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {player.stats ? (
                    <span className="text-gray-300 font-medium">
                      {player.stats.hours_played.toLocaleString()}h
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className="bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4">
              <RankBadge rank={index + 1} />
              <Image
                src={player.avatar}
                alt={player.username}
                width={44}
                height={44}
                className="rounded-full border-2 border-gray-700"
              />
              <div className="flex-1 min-w-0">
                <a
                  href={player.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-white hover:text-orange-400 transition-colors truncate block"
                >
                  {player.username}
                </a>
                {player.isPrivate && (
                  <p className="text-xs text-gray-600">Private profile</p>
                )}
              </div>
              {player.stats && (
                <span
                  className={`font-black text-xl ${kdColor(player.stats.kd_ratio)}`}
                >
                  {player.stats.kd_ratio.toFixed(2)}
                </span>
              )}
            </div>

            <div className="px-4 pb-4 grid grid-cols-3 gap-2 text-center">
              <StatCell label="Kills" value={player.stats?.total_kills.toLocaleString() ?? "—"} />
              <StatCell label="Wins" value={player.stats?.total_wins.toLocaleString() ?? "—"} />
              <StatCell label="Hours" value={player.stats ? `${player.stats.hours_played}h` : "—"} />
            </div>
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">No players registered yet.</p>
          <p className="text-sm mt-1">
            Sign in with Steam to appear on the leaderboard!
          </p>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0a0a0f] rounded-lg p-2">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-white">{value}</p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 font-black text-sm">
        #1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-400/10 text-gray-300 font-black text-sm">
        #2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-800/20 text-orange-600 font-black text-sm">
        #3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 text-gray-600 font-bold text-sm">
      #{rank}
    </span>
  );
}
