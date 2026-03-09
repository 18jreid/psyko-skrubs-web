"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";

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
  cs2Elo: number | null;
  stats: CS2Stats | null;
  isPrivate: boolean;
}

interface SeasonSnapshot {
  id: string;
  rank: number;
  cs2Elo: number | null;
  user: { id: string; username: string; avatar: string };
}

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  snapshots: SeasonSnapshot[];
}

interface Props {
  initialPlayers: Player[];
  seasons: Season[];
}

type SortKey = "cs2Elo" | "kd_ratio" | "total_wins" | "hours_played" | "total_kills";

function eloTier(elo: number): { label: string; color: string; bg: string } {
  if (elo >= 30000) return { label: "Global Elite", color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/30" };
  if (elo >= 25000) return { label: "Supreme", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
  if (elo >= 20000) return { label: "Legendary Eagle", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" };
  if (elo >= 15000) return { label: "Master Guardian", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" };
  if (elo >= 10000) return { label: "Gold Nova", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" };
  if (elo >= 5000) return { label: "Silver", color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/30" };
  return { label: "Unranked", color: "text-gray-600", bg: "bg-gray-800/50 border-gray-700/30" };
}

function kdColor(kd: number): string {
  if (kd >= 1.5) return "text-green-400";
  if (kd >= 1.0) return "text-yellow-400";
  return "text-red-400";
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
  if (rank === 1) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 font-black text-sm">#1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-400/10 text-gray-300 font-black text-sm">#2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-800/20 text-orange-600 font-black text-sm">#3</span>;
  return <span className="inline-flex items-center justify-center w-8 h-8 text-gray-600 font-bold text-sm">#{rank}</span>;
}

function SeasonNav({ seasons, selected, onSelect, onNew, onArchive, archiving, hasSession, activeSeason }: {
  seasons: Season[]; selected: string | null; onSelect: (id: string | null) => void;
  onNew: () => void; onArchive: (id: string) => void; archiving: boolean; hasSession: boolean;
  activeSeason: Season | null;
}) {
  if (seasons.length === 0 && !hasSession) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <button onClick={() => onSelect(null)} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${!selected ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
        Live
      </button>
      {seasons.map((s) => (
        <button key={s.id} onClick={() => onSelect(s.id)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${selected === s.id ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
          {s.isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
          {s.name}
        </button>
      ))}
      {hasSession && (
        <>
          {activeSeason && (
            <button onClick={() => onArchive(activeSeason.id)} disabled={archiving} className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors disabled:opacity-40">
              {archiving ? "Archiving..." : "Archive Season"}
            </button>
          )}
          <button onClick={onNew} className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
            + New Season
          </button>
        </>
      )}
    </div>
  );
}

export default function RankingsTable({ initialPlayers, seasons }: Props) {
  const { data: session } = useSession();
  const [players, setPlayers] = useState(initialPlayers);
  const [sortBy, setSortBy] = useState<SortKey>("cs2Elo");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [localSeasons, setLocalSeasons] = useState(seasons);
  const [archiving, setArchiving] = useState(false);

  // ELO modal
  const [showEloModal, setShowEloModal] = useState(false);
  const [eloInput, setEloInput] = useState("");
  const [savingElo, setSavingElo] = useState(false);
  const [eloError, setEloError] = useState("");

  // Season modal
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [savingSeason, setSavingSeason] = useState(false);
  const [seasonError, setSeasonError] = useState("");

  const myPlayer = session ? players.find((p) => p.id === session.user?.id) : null;
  const activeSeason = localSeasons.find((s) => s.isActive) ?? null;
  const selectedSeason = selectedSeasonId ? localSeasons.find((s) => s.id === selectedSeasonId) : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/rankings", { cache: "no-store" });
      if (res.ok) setPlayers(await res.json());
    } finally { setRefreshing(false); }
  };

  const handleSaveElo = async () => {
    const num = parseInt(eloInput.trim(), 10);
    if (isNaN(num) || num < 0 || num > 35000) { setEloError("Must be 0–35,000"); return; }
    setSavingElo(true); setEloError("");
    try {
      const res = await fetch("/api/user/elo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elo: num }),
      });
      if (res.ok) {
        setPlayers((prev) => prev.map((p) => p.id === session?.user?.id ? { ...p, cs2Elo: num } : p));
        setShowEloModal(false); setEloInput("");
      } else { const d = await res.json(); setEloError(d.error || "Failed"); }
    } catch { setEloError("Something went wrong"); }
    finally { setSavingElo(false); }
  };

  const handleNewSeason = async () => {
    if (!seasonName.trim()) { setSeasonError("Name required"); return; }
    setSavingSeason(true); setSeasonError("");
    try {
      const res = await fetch("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: seasonName.trim() }),
      });
      if (res.ok) {
        const s = await res.json();
        setLocalSeasons((prev) => [{ ...s, snapshots: [] }, ...prev.map((x) => ({ ...x, isActive: false }))]);
        setShowSeasonModal(false); setSeasonName("");
      } else { const d = await res.json(); setSeasonError(d.error || "Failed"); }
    } catch { setSeasonError("Something went wrong"); }
    finally { setSavingSeason(false); }
  };

  const handleArchive = async (seasonId: string) => {
    if (!confirm("Archive this season? This will snapshot current ELO standings and end the season.")) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/seasons/${seasonId}/archive`, { method: "POST" });
      if (res.ok) {
        setLocalSeasons((prev) => prev.map((s) =>
          s.id === seasonId ? { ...s, isActive: false, endDate: new Date().toISOString() } : s
        ));
      }
    } finally { setArchiving(false); }
  };

  const sorted = [...players].sort((a, b) => {
    if (a.isPrivate && !b.isPrivate) return 1;
    if (!a.isPrivate && b.isPrivate) return -1;
    if (sortBy === "cs2Elo") {
      const diff = (b.cs2Elo ?? -1) - (a.cs2Elo ?? -1);
      if (diff !== 0) return diff;
      if (!a.stats || !b.stats) return 0;
      return b.stats.kd_ratio - a.stats.kd_ratio;
    }
    if (!a.stats || !b.stats) return 0;
    if (sortBy === "kd_ratio") return b.stats.kd_ratio - a.stats.kd_ratio;
    if (sortBy === "total_wins") return b.stats.total_wins - a.stats.total_wins;
    if (sortBy === "hours_played") return b.stats.hours_played - a.stats.hours_played;
    if (sortBy === "total_kills") return b.stats.total_kills - a.stats.total_kills;
    return 0;
  });

  const SortBtn = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => setSortBy(field)} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${sortBy === field ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
      {label}
    </button>
  );

  // Past season view
  if (selectedSeason && !selectedSeason.isActive) {
    return (
      <div>
        <SeasonNav seasons={localSeasons} selected={selectedSeasonId} onSelect={setSelectedSeasonId} onNew={() => setShowSeasonModal(true)} onArchive={handleArchive} archiving={archiving} hasSession={!!session} activeSeason={activeSeason} />
        <div className="bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
            <span className="font-bold text-white">{selectedSeason.name}</span>
            <span className="text-xs text-gray-500">{new Date(selectedSeason.startDate).toLocaleDateString()} – {selectedSeason.endDate ? new Date(selectedSeason.endDate).toLocaleDateString() : "ongoing"}</span>
          </div>
          {selectedSeason.snapshots.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">No snapshots recorded for this season.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Player</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-orange-500/80 uppercase">Premier ELO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {selectedSeason.snapshots.map((snap) => {
                  const tier = snap.cs2Elo != null ? eloTier(snap.cs2Elo) : null;
                  return (
                    <tr key={snap.id} className="bg-[#0a0a0f] hover:bg-[#0d0d18] transition-colors">
                      <td className="px-4 py-4"><RankBadge rank={snap.rank} /></td>
                      <td className="px-4 py-4">
                        <Link href={`/profile/${snap.user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <Image src={snap.user.avatar} alt={snap.user.username} width={36} height={36} className="rounded-full border-2 border-gray-700" />
                          <span className="font-medium text-white">{snap.user.username}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {snap.cs2Elo != null && tier ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className={`font-black text-lg ${tier.color}`}>{snap.cs2Elo.toLocaleString()}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tier.bg} ${tier.color}`}>{tier.label}</span>
                          </div>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SeasonNav seasons={localSeasons} selected={selectedSeasonId} onSelect={setSelectedSeasonId} onNew={() => setShowSeasonModal(true)} onArchive={handleArchive} archiving={archiving} hasSession={!!session} activeSeason={activeSeason} />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 mr-1">Sort:</span>
          <SortBtn label="Premier ELO" field="cs2Elo" />
          <SortBtn label="K/D" field="kd_ratio" />
          <SortBtn label="Wins" field="total_wins" />
          <SortBtn label="Hours" field="hours_played" />
          <SortBtn label="Kills" field="total_kills" />
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <button onClick={() => { setEloInput(myPlayer?.cs2Elo?.toString() ?? ""); setEloError(""); setShowEloModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {myPlayer?.cs2Elo != null ? "Update ELO" : "Set My ELO"}
            </button>
          )}
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {!session && (
        <div className="flex items-start gap-3 p-3.5 bg-orange-500/5 border border-orange-500/20 rounded-xl text-sm text-orange-400/80 mb-6">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span><a href="/api/auth/steam" className="font-bold hover:text-orange-300 transition-colors">Sign in with Steam</a> to set your Premier ELO and appear on the leaderboard.</span>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl overflow-hidden border border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0d0d15] border-b border-gray-800">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Player</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-orange-500/80 uppercase tracking-wider">Premier ELO</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">K/D</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Kills</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Wins</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {sorted.map((player, index) => {
              const tier = player.cs2Elo != null ? eloTier(player.cs2Elo) : null;
              return (
                <tr key={player.id} className="bg-[#0a0a0f] hover:bg-[#0d0d18] transition-colors">
                  <td className="px-4 py-4"><RankBadge rank={index + 1} /></td>
                  <td className="px-4 py-4">
                    <Link href={`/profile/${player.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      <Image src={player.avatar} alt={player.username} width={40} height={40} className="rounded-full border-2 border-gray-700" />
                      <div>
                        <p className="font-medium text-white">{player.username}</p>
                        {player.isPrivate && <p className="text-xs text-gray-600 mt-0.5">Private profile</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {player.cs2Elo != null && tier ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-black text-lg ${tier.color}`}>{player.cs2Elo.toLocaleString()}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tier.bg} ${tier.color}`}>{tier.label}</span>
                      </div>
                    ) : <span className="text-gray-600 text-sm">Not set</span>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {player.stats ? <span className={`font-black text-lg ${kdColor(player.stats.kd_ratio)}`}>{player.stats.kd_ratio.toFixed(2)}</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {player.stats ? <span className="text-gray-300 font-medium">{player.stats.total_kills.toLocaleString()}</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {player.stats ? <span className="text-gray-300 font-medium">{player.stats.total_wins.toLocaleString()}</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {player.stats ? <span className="text-gray-300 font-medium">{player.stats.hours_played.toLocaleString()}h</span> : <span className="text-gray-600">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((player, index) => {
          const tier = player.cs2Elo != null ? eloTier(player.cs2Elo) : null;
          return (
            <Link key={player.id} href={`/profile/${player.id}`} className="bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden block hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-3 p-4">
                <RankBadge rank={index + 1} />
                <Image src={player.avatar} alt={player.username} width={44} height={44} className="rounded-full border-2 border-gray-700" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{player.username}</p>
                  {tier ? <span className={`text-[10px] font-bold uppercase tracking-wider ${tier.color}`}>{tier.label}</span> : player.isPrivate ? <p className="text-xs text-gray-600">Private</p> : null}
                </div>
                {player.cs2Elo != null && tier ? (
                  <span className={`font-black text-xl ${tier.color}`}>{player.cs2Elo.toLocaleString()}</span>
                ) : player.stats ? (
                  <span className={`font-black text-xl ${kdColor(player.stats.kd_ratio)}`}>{player.stats.kd_ratio.toFixed(2)}</span>
                ) : null}
              </div>
              <div className="px-4 pb-4 grid grid-cols-3 gap-2 text-center">
                <StatCell label="K/D" value={player.stats ? player.stats.kd_ratio.toFixed(2) : "—"} />
                <StatCell label="Wins" value={player.stats?.total_wins.toLocaleString() ?? "—"} />
                <StatCell label="Hours" value={player.stats ? `${player.stats.hours_played}h` : "—"} />
              </div>
            </Link>
          );
        })}
      </div>

      {players.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">No players registered yet.</p>
          <p className="text-sm mt-1">Sign in with Steam to appear on the leaderboard!</p>
        </div>
      )}

      {/* ELO Modal */}
      {showEloModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Set Your Premier ELO</h3>
            <p className="text-sm text-gray-400 mb-5">Find your rating in the Premier tab in-game.</p>
            <input value={eloInput} onChange={(e) => setEloInput(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 15420" maxLength={6} className="w-full bg-[#0a0a0f] border border-gray-700 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors mb-3" />
            {eloInput && !isNaN(parseInt(eloInput)) && (() => { const t = eloTier(parseInt(eloInput)); return <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 ${t.bg}`}><span className={`text-xs font-bold uppercase tracking-wider ${t.color}`}>{t.label}</span><span className={`text-xs ${t.color} opacity-70`}>— {parseInt(eloInput).toLocaleString()} ELO</span></div>; })()}
            {eloError && <p className="text-red-400 text-xs mb-3">{eloError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowEloModal(false); setEloError(""); setEloInput(""); }} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleSaveElo} disabled={savingElo || !eloInput.trim()} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">{savingElo ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* New Season Modal */}
      {showSeasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">New Season</h3>
            <p className="text-sm text-gray-400 mb-5">This will end the current active season and start a new one.</p>
            <input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="e.g. Season 2 — Spring 2026" maxLength={60} className="w-full bg-[#0a0a0f] border border-gray-700 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors mb-3" />
            {seasonError && <p className="text-red-400 text-xs mb-3">{seasonError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowSeasonModal(false); setSeasonError(""); setSeasonName(""); }} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleNewSeason} disabled={savingSeason || !seasonName.trim()} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">{savingSeason ? "Creating..." : "Start Season"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
