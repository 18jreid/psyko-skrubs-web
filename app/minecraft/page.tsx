"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ModrinthProject,
  formatDownloads,
  loaderColor,
  LOADERS,
  PROJECT_TYPES,
  SORT_OPTIONS,
  MC_VERSIONS,
} from "@/lib/modrinth";

const LOADERS_DISPLAY = LOADERS.filter((l) => l !== "all");
const TYPE_LABELS: Record<string, string> = {
  all: "All",
  mod: "Mods",
  modpack: "Modpacks",
  resourcepack: "Resource Packs",
  shader: "Shaders",
  plugin: "Plugins",
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

function ProjectCard({ project }: { project: ModrinthProject }) {
  const loaders = project.categories.filter((c) =>
    LOADERS_DISPLAY.includes(c)
  );
  const tags = project.display_categories.filter(
    (c) => !LOADERS_DISPLAY.includes(c)
  );
  const latestVersion = project.versions[project.versions.length - 1];

  return (
    <a
      href={`https://modrinth.com/${project.project_type}/${project.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-[#0d0d15] border border-gray-800 rounded-xl p-4 flex gap-4 hover:border-gray-700 hover:bg-[#0f0f1a] transition-all"
    >
      {/* Icon */}
      <div className="shrink-0">
        {project.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.icon_url}
            alt={project.title}
            className="w-14 h-14 rounded-xl object-cover bg-gray-800"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-bold text-white group-hover:text-green-400 transition-colors truncate">
            {project.title}
          </span>
          <span className="text-xs text-gray-500">by {project.author}</span>
        </div>

        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-2">
          {project.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {loaders.map((l) => (
            <span
              key={l}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${loaderColor(l)}`}
            >
              {l}
            </span>
          ))}
          {tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border bg-gray-800/60 text-gray-500 border-gray-700/40"
            >
              {t}
            </span>
          ))}
          {latestVersion && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-green-500/5 text-green-600 border-green-700/20">
              {latestVersion}
            </span>
          )}
        </div>

        {/* Stats */}
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
          <span className="ml-auto text-green-600/70 group-hover:text-green-500 transition-colors hidden sm:block">
            View on Modrinth →
          </span>
        </div>
      </div>
    </a>
  );
}

export default function MinecraftPage() {
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

  const fetchResults = useCallback(
    async (newOffset = 0, append = false) => {
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

        const res = await fetch(
          `https://api.modrinth.com/v2/search?${params.toString()}`,
          { headers: { "User-Agent": "psyko-skrubs-web/1.0" } }
        );

        if (!res.ok) return;
        const data = await res.json();

        setTotalHits(data.total_hits ?? 0);
        if (append) {
          setResults((prev) => [...prev, ...data.hits]);
        } else {
          setResults(data.hits ?? []);
        }
        setOffset(newOffset + (data.hits?.length ?? 0));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, projectType, loader, mcVersion, sortBy]
  );

  // Debounce search query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      fetchResults(0, false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchResults]);

  const handleLoadMore = () => {
    fetchResults(offset, true);
  };

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
              Minecraft <span className="text-green-400">Mods</span>
            </h1>
          </div>
          <p className="text-gray-500 mt-1">
            Browse mods, modpacks, shaders, and more — powered by Modrinth
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="relative mb-4">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mods, modpacks, shaders..."
            className="w-full bg-[#0d0d15] border border-gray-700 focus:border-green-500/50 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Project type */}
          <select
            value={projectType}
            onChange={(e) => { setProjectType(e.target.value); setOffset(0); }}
            className="bg-[#0d0d15] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500/50 transition-colors"
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>

          {/* Loader */}
          <select
            value={loader}
            onChange={(e) => { setLoader(e.target.value); setOffset(0); }}
            className="bg-[#0d0d15] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500/50 transition-colors"
          >
            <option value="all">All Loaders</option>
            {LOADERS_DISPLAY.map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>

          {/* MC Version */}
          <select
            value={mcVersion}
            onChange={(e) => { setMcVersion(e.target.value); setOffset(0); }}
            className="bg-[#0d0d15] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500/50 transition-colors"
          >
            {MC_VERSIONS.map((v) => (
              <option key={v} value={v}>{v === "all" ? "All Versions" : v}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setOffset(0); }}
            className="bg-[#0d0d15] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500/50 transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Result count */}
          {!loading && (
            <span className="ml-auto self-center text-sm text-gray-500">
              {totalHits.toLocaleString()} results
            </span>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#0d0d15] border border-gray-800 rounded-xl h-28 animate-pulse" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="space-y-3">
              {results.map((project) => (
                <ProjectCard key={project.project_id} project={project} />
              ))}
            </div>

            {offset < totalHits && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : `Load more (${(totalHits - offset).toLocaleString()} remaining)`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500">No results found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
