"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ModrinthProject,
  formatDownloads,
  loaderColor,
  LOADERS,
  PROJECT_TYPES,
  SORT_OPTIONS,
  MC_VERSIONS,
} from "@/lib/modrinth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServerStatus {
  online: boolean;
  host?: string;
  port?: number;
  version?: { name: string; protocol: number };
  players?: { online: number; max: number; list?: { name: string; uuid: string }[] };
  motd?: { clean: string[] };
  icon?: string;
  software?: string;
}

interface PlayerInfo {
  uuid: string;
  name: string;
  headUrl: string;
  bodyUrl: string;
  skinUrl: string | null;
  capeUrl: string | null;
  error?: string;
}

interface Member {
  id: string;
  username: string;
  avatar: string;
  profileUrl: string;
  minecraftUsername: string;
  uuid: string | null;
  headUrl: string | null;
  bodyUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOADERS_DISPLAY = LOADERS.filter((l) => l !== "all");
const TYPE_LABELS: Record<string, string> = {
  all: "All", mod: "Mods", modpack: "Modpacks",
  resourcepack: "Resource Packs", shader: "Shaders", plugin: "Plugins",
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: ModrinthProject }) {
  const loaders = project.categories.filter((c) => LOADERS_DISPLAY.includes(c));
  const tags = project.display_categories.filter((c) => !LOADERS_DISPLAY.includes(c));
  const latestVersion = project.versions[project.versions.length - 1];

  return (
    <a
      href={`https://modrinth.com/${project.project_type}/${project.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-[#0d0d15] border border-gray-800 rounded-xl p-4 flex gap-4 hover:border-gray-700 hover:bg-[#0f0f1a] transition-all"
    >
      <div className="shrink-0">
        {project.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.icon_url} alt={project.title} className="w-14 h-14 rounded-xl object-cover bg-gray-800" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-bold text-white group-hover:text-green-400 transition-colors truncate">{project.title}</span>
          <span className="text-xs text-gray-500">by {project.author}</span>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-2">{project.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {loaders.map((l) => (
            <span key={l} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${loaderColor(l)}`}>{l}</span>
          ))}
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border bg-gray-800/60 text-gray-500 border-gray-700/40">{t}</span>
          ))}
          {latestVersion && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-green-500/5 text-green-600 border-green-700/20">{latestVersion}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {formatDownloads(project.downloads)}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {formatDownloads(project.follows)}
          </span>
          <span>Updated {relativeDate(project.date_modified)}</span>
          <span className="ml-auto text-green-600/70 group-hover:text-green-500 transition-colors hidden sm:block">View on Modrinth →</span>
        </div>
      </div>
    </a>
  );
}

function ServerCard({ host, status, onRefresh, refreshing }: {
  host: string;
  status: ServerStatus | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  if (!status) {
    return (
      <div className="bg-[#0d0d15] border border-gray-800 rounded-xl p-5 animate-pulse h-32" />
    );
  }

  return (
    <div className={`bg-[#0d0d15] border rounded-xl p-5 transition-colors ${status.online ? "border-green-500/20" : "border-red-500/20"}`}>
      <div className="flex items-start gap-4">
        {status.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={status.icon} alt="Server icon" className="w-14 h-14 rounded-lg pixelated shrink-0" style={{ imageRendering: "pixelated" }} />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-white">{host}</span>
            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${status.online ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.online ? "bg-green-400" : "bg-red-400"}`} />
              {status.online ? "Online" : "Offline"}
            </span>
            {status.software && (
              <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full border border-gray-700/40 bg-gray-800/40">{status.software}</span>
            )}
          </div>
          {status.online && (
            <>
              {status.motd?.clean?.[0] && (
                <p className="text-sm text-gray-400 mb-2 truncate">{status.motd.clean[0]}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-bold text-white">{status.players?.online}</span>
                  <span className="text-gray-500">/ {status.players?.max}</span>
                </span>
                {status.version?.name && (
                  <span className="text-gray-500 text-xs">{status.version.name}</span>
                )}
              </div>
              {status.players?.list && status.players.list.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {status.players.list.map((p) => (
                    <span key={p.uuid} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{p.name}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="shrink-0 p-2 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "mods" | "servers" | "players" | "members";

function ModsTab() {
  const [query, setQuery] = useState("");
  const [projectType, setProjectType] = useState("all");
  const [loader, setLoader] = useState("all");
  const [mcVersion, setMcVersion] = useState("all");
  const [sortBy, setSortBy] = useState("downloads");
  const [results, setResults] = useState<ModrinthProject[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (newOffset = 0, append = false) => {
    if (newOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const facets: string[][] = [];
      if (projectType !== "all") facets.push([`project_type:${projectType}`]);
      if (loader !== "all") facets.push([`categories:${loader}`]);
      if (mcVersion !== "all") facets.push([`versions:${mcVersion}`]);
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (facets.length) params.set("facets", JSON.stringify(facets));
      params.set("index", sortBy);
      params.set("offset", String(newOffset));
      params.set("limit", "20");
      const res = await fetch(`https://api.modrinth.com/v2/search?${params.toString()}`, {
        headers: { "User-Agent": "psyko-skrubs-web/1.0" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTotalHits(data.total_hits ?? 0);
      if (append) setResults((prev) => [...prev, ...data.hits]);
      else setResults(data.hits ?? []);
      setOffset(newOffset + (data.hits?.length ?? 0));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, projectType, loader, mcVersion, sortBy]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setOffset(0); fetchResults(0, false); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchResults]);

  return (
    <div>
      <div className="relative mb-4">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search mods, modpacks, shaders..."
          className="w-full bg-[#0d0d15] border border-gray-700 focus:border-green-500/50 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={projectType} onChange={(e) => { setProjectType(e.target.value); setOffset(0); }} className="bg-[#0d0d15] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500/50">
          {PROJECT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
        </select>
        <select value={loader} onChange={(e) => { setLoader(e.target.value); setOffset(0); }} className="bg-[#0d0d15] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500/50">
          <option value="all">All Loaders</option>
          {LOADERS_DISPLAY.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
        </select>
        <select value={mcVersion} onChange={(e) => { setMcVersion(e.target.value); setOffset(0); }} className="bg-[#0d0d15] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500/50">
          {MC_VERSIONS.map((v) => <option key={v} value={v}>{v === "all" ? "All Versions" : v}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setOffset(0); }} className="bg-[#0d0d15] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500/50">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {!loading && <span className="ml-auto self-center text-sm text-gray-500">{totalHits.toLocaleString()} results</span>}
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-[#0d0d15] border border-gray-800 rounded-xl h-28 animate-pulse" />)}</div>
      ) : results.length > 0 ? (
        <>
          <div className="space-y-3">{results.map((p) => <ProjectCard key={p.project_id} project={p} />)}</div>
          {offset < totalHits && (
            <div className="flex justify-center mt-8">
              <button onClick={() => fetchResults(offset, true)} disabled={loadingMore} className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {loadingMore ? "Loading..." : `Load more (${(totalHits - offset).toLocaleString()} remaining)`}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">No results found. Try adjusting your filters.</div>
      )}
    </div>
  );
}

function ServersTab() {
  const [customHost, setCustomHost] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [statuses, setStatuses] = useState<Record<string, ServerStatus | null>>({});
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const fetchStatus = useCallback(async (host: string) => {
    setRefreshing((prev) => ({ ...prev, [host]: true }));
    try {
      const res = await fetch(`/api/minecraft/server?host=${encodeURIComponent(host)}`);
      const data = await res.json();
      setStatuses((prev) => ({ ...prev, [host]: data }));
    } catch {
      setStatuses((prev) => ({ ...prev, [host]: { online: false } }));
    } finally {
      setRefreshing((prev) => ({ ...prev, [host]: false }));
    }
  }, []);

  const handleAdd = () => {
    const h = customInput.trim();
    if (!h) return;
    setCustomHost(h);
    setCustomInput("");
    setStatuses((prev) => ({ ...prev, [h]: null }));
    fetchStatus(h);
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Enter any Java or Bedrock server address to check its status.</p>
      <div className="flex gap-2 mb-6">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="mc.example.com or 192.168.1.1:25565"
          className="flex-1 bg-[#0d0d15] border border-gray-700 focus:border-green-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!customInput.trim()}
          className="px-5 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-colors"
        >
          Check
        </button>
      </div>

      {customHost && (
        <ServerCard
          host={customHost}
          status={statuses[customHost] ?? null}
          onRefresh={() => fetchStatus(customHost)}
          refreshing={refreshing[customHost] ?? false}
        />
      )}

      {!customHost && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
          </div>
          <p className="text-gray-500">Enter a server address above to check its status.</p>
        </div>
      )}
    </div>
  );
}

function PlayersTab() {
  const [input, setInput] = useState("");
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    const u = input.trim();
    if (!u) return;
    setLoading(true);
    setError("");
    setPlayer(null);
    try {
      const res = await fetch(`/api/minecraft/player?username=${encodeURIComponent(u)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Player not found"); return; }
      setPlayer(data);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Look up any Minecraft Java Edition account by username.</p>
      <div className="flex gap-2 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="Enter a Minecraft username..."
          maxLength={16}
          className="flex-1 bg-[#0d0d15] border border-gray-700 focus:border-green-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors"
        />
        <button
          onClick={lookup}
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {loading ? "Looking up..." : "Look Up"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {player && (
        <div className="bg-[#0d0d15] border border-green-500/20 rounded-xl p-6 flex flex-col sm:flex-row gap-6">
          {/* Body render */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={player.bodyUrl} alt={player.name} className="h-40" style={{ imageRendering: "pixelated" }} />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-black text-white mb-1">{player.name}</h3>
            <p className="text-xs text-gray-500 font-mono mb-4 break-all">{player.uuid}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Username" value={player.name} />
              <InfoRow label="UUID" value={`${player.uuid.slice(0, 8)}...`} mono />
              <InfoRow label="Skin" value={player.skinUrl ? "Custom" : "Default"} />
              <InfoRow label="Cape" value={player.capeUrl ? "Yes" : "None"} />
            </div>
            <div className="flex gap-2 mt-4">
              <a href={`https://crafatar.com/renders/body/${player.uuid}?scale=10&overlay`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors">
                Full Render
              </a>
              {player.skinUrl && (
                <a href={player.skinUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors">
                  Download Skin
                </a>
              )}
              <a href={`https://namemc.com/profile/${player.uuid}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors">
                NameMC
              </a>
            </div>
          </div>
        </div>
      )}

      {!player && !error && !loading && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-gray-500">Search for a player to see their skin and profile info.</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-[#0a0a0f] rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold text-white truncate ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function MembersTab() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mcInput, setMcInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/minecraft/members");
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const myMember = session ? members.find((m) => m.id === session.user?.id) : null;

  const handleSave = async () => {
    const u = mcInput.trim();
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/user/minecraft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u || null }),
      });
      if (res.ok) {
        setShowModal(false);
        setMcInput("");
        setLoading(true);
        fetchMembers();
      } else {
        const d = await res.json();
        setSaveError(d.error || "Failed to save");
      }
    } catch {
      setSaveError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {members.length} member{members.length !== 1 ? "s" : ""} linked their Minecraft account
        </p>
        {session && (
          <button
            onClick={() => { setMcInput(myMember?.minecraftUsername ?? ""); setSaveError(""); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-sm transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {myMember ? "Update Username" : "Link My Account"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#0d0d15] border border-gray-800 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : members.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {members.map((m) => (
            <div key={m.id} className="bg-[#0d0d15] border border-gray-800 rounded-xl p-4 flex flex-col items-center text-center hover:border-gray-700 transition-colors">
              {m.bodyUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.bodyUrl} alt={m.minecraftUsername} className="h-28 mb-3" style={{ imageRendering: "pixelated" }} />
              ) : (
                <div className="h-28 w-16 bg-gray-800 rounded mb-3 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <p className="font-bold text-white text-sm">{m.minecraftUsername}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.avatar} alt={m.username} className="w-4 h-4 rounded-full" />
                <p className="text-xs text-gray-500 truncate max-w-[100px]">{m.username}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No members linked yet.</p>
          {!session && (
            <a href="/api/auth/steam" className="text-green-400 hover:text-green-300 text-sm transition-colors">Sign in with Steam</a>
          )}
        </div>
      )}

      {!session && members.length > 0 && (
        <p className="text-center text-xs text-gray-600 mt-6">
          <a href="/api/auth/steam" className="text-green-400 hover:text-green-300 transition-colors">Sign in with Steam</a> to link your Minecraft account
        </p>
      )}

      {/* Link modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Link Minecraft Account</h3>
            <p className="text-sm text-gray-400 mb-5">Enter your Java Edition username. It will be verified against Mojang.</p>
            <input
              value={mcInput}
              onChange={(e) => setMcInput(e.target.value.trim())}
              placeholder="e.g. Notch"
              maxLength={16}
              className="w-full bg-[#0a0a0f] border border-gray-700 focus:border-green-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors mb-3"
            />
            {saveError && <p className="text-red-400 text-xs mb-3">{saveError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); setSaveError(""); setMcInput(""); }}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {saving ? "Verifying..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "mods", label: "Mods", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" },
  { id: "servers", label: "Servers", icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" },
  { id: "players", label: "Players", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "members", label: "Members", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function MinecraftPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mods");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white">
              Minecraft <span className="text-green-400">Hub</span>
            </h1>
          </div>
          <p className="text-gray-500 mt-1">Mods, server status, player lookup, and group roster</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-green-400 text-green-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        {activeTab === "mods" && <ModsTab />}
        {activeTab === "servers" && <ServersTab />}
        {activeTab === "players" && <PlayersTab />}
        {activeTab === "members" && <MembersTab />}
      </div>
    </div>
  );
}
