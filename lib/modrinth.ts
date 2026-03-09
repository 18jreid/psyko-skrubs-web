export interface ModrinthProject {
  project_id: string;
  project_type: "mod" | "modpack" | "resourcepack" | "shader" | "plugin";
  slug: string;
  author: string;
  title: string;
  description: string;
  categories: string[];
  display_categories: string[];
  versions: string[];
  downloads: number;
  follows: number;
  icon_url: string | null;
  date_created: string;
  date_modified: string;
  latest_version: string;
  license: string;
  client_side: string;
  server_side: string;
  gallery: string[];
  color: number | null;
}

export interface ModrinthSearchResult {
  hits: ModrinthProject[];
  offset: number;
  limit: number;
  total_hits: number;
}

const BASE = "https://api.modrinth.com/v2";

export async function searchModrinth(params: {
  query?: string;
  projectType?: string;
  loader?: string;
  version?: string;
  sortBy?: string;
  offset?: number;
  limit?: number;
}): Promise<ModrinthSearchResult | null> {
  try {
    const facets: string[][] = [];

    if (params.projectType && params.projectType !== "all") {
      facets.push([`project_type:${params.projectType}`]);
    }
    if (params.loader && params.loader !== "all") {
      facets.push([`categories:${params.loader}`]);
    }
    if (params.version && params.version !== "all") {
      facets.push([`versions:${params.version}`]);
    }

    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    if (facets.length) searchParams.set("facets", JSON.stringify(facets));
    searchParams.set("index", params.sortBy ?? "downloads");
    searchParams.set("offset", String(params.offset ?? 0));
    searchParams.set("limit", String(params.limit ?? 20));

    const res = await fetch(`${BASE}/search?${searchParams.toString()}`, {
      headers: { "User-Agent": "psyko-skrubs-web/1.0" },
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function formatDownloads(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function loaderColor(loader: string): string {
  switch (loader) {
    case "fabric": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "forge": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "neoforge": return "bg-orange-600/10 text-orange-300 border-orange-600/20";
    case "quilt": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "paper":
    case "spigot":
    case "bukkit":
    case "purpur": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    default: return "bg-gray-700/50 text-gray-400 border-gray-600/20";
  }
}

export const LOADERS = ["all", "fabric", "forge", "neoforge", "quilt", "paper", "spigot"];
export const PROJECT_TYPES = ["all", "mod", "modpack", "resourcepack", "shader", "plugin"];
export const SORT_OPTIONS = [
  { value: "downloads", label: "Most Downloaded" },
  { value: "follows", label: "Most Followed" },
  { value: "newest", label: "Newest" },
  { value: "updated", label: "Recently Updated" },
  { value: "relevance", label: "Relevance" },
];
export const MC_VERSIONS = [
  "all", "1.21.4", "1.21.3", "1.21.1", "1.21", "1.20.6", "1.20.4",
  "1.20.1", "1.20", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5",
];
