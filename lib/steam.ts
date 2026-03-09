const STEAM_API_KEY = process.env.STEAM_API_KEY || "";
const STEAM_API_BASE = "https://api.steampowered.com";

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
  communityvisibilitystate: number;
  personastate: number;
  gameextrainfo?: string;
  gameid?: string;
  lastlogoff?: number;
}

export interface RecentGame {
  appid: number;
  name: string;
  playtime_2weeks: number;
  playtime_forever: number;
  img_icon_url: string;
}

export interface CS2Stats {
  total_kills: number;
  total_deaths: number;
  total_wins: number;
  total_time_played: number;
  kd_ratio: number;
  hours_played: number;
  total_shots_fired: number;
  total_shots_hit: number;
  total_headshot_kills: number;
  total_mvps: number;
  total_rounds_played: number;
  total_matches_played: number;
  accuracy: number;       // shots_hit / shots_fired %
  headshot_pct: number;   // headshot_kills / kills %
  win_rate: number;       // wins / matches_played %
}

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
  header_image?: string;
}

export async function getPlayerSummary(
  steamId: string
): Promise<SteamPlayerSummary | null> {
  try {
    const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const players = data?.response?.players;
    if (!players || players.length === 0) return null;
    return players[0] as SteamPlayerSummary;
  } catch {
    return null;
  }
}

export async function getCS2Stats(steamId: string): Promise<CS2Stats | null> {
  try {
    const url = `${STEAM_API_BASE}/ISteamUserStats/GetUserStatsForGame/v2/?key=${STEAM_API_KEY}&steamid=${steamId}&appid=730`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const stats = data?.playerstats?.stats;
    if (!stats) return null;

    const statsMap: Record<string, number> = {};
    for (const stat of stats) {
      statsMap[stat.name] = stat.value;
    }

    const total_kills = statsMap["total_kills"] ?? 0;
    const total_deaths = statsMap["total_deaths"] ?? 0;
    const total_wins = statsMap["total_wins"] ?? 0;
    const total_time_played = statsMap["total_time_played"] ?? 0;
    const total_shots_fired = statsMap["total_shots_fired"] ?? 0;
    const total_shots_hit = statsMap["total_shots_hit"] ?? 0;
    const total_headshot_kills = statsMap["total_kills_headshot"] ?? 0;
    const total_mvps = statsMap["total_mvps"] ?? 0;
    const total_rounds_played = statsMap["total_rounds_played"] ?? 0;
    const total_matches_played = statsMap["total_matches_played"] ?? 0;

    return {
      total_kills,
      total_deaths,
      total_wins,
      total_time_played,
      total_shots_fired,
      total_shots_hit,
      total_headshot_kills,
      total_mvps,
      total_rounds_played,
      total_matches_played,
      kd_ratio: total_deaths > 0
        ? Math.round((total_kills / total_deaths) * 100) / 100
        : total_kills,
      hours_played: Math.round(total_time_played / 3600),
      accuracy: total_shots_fired > 0
        ? Math.round((total_shots_hit / total_shots_fired) * 1000) / 10
        : 0,
      headshot_pct: total_kills > 0
        ? Math.round((total_headshot_kills / total_kills) * 1000) / 10
        : 0,
      win_rate: total_matches_played > 0
        ? Math.round((total_wins / total_matches_played) * 1000) / 10
        : 0,
    };
  } catch {
    return null;
  }
}

export async function getRecentlyPlayedGames(
  steamId: string
): Promise<RecentGame[] | null> {
  try {
    const url = `${STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&count=10`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const games = data?.response?.games;
    if (!games) return null;
    return games as RecentGame[];
  } catch {
    return null;
  }
}

export async function getOwnedGames(
  steamId: string
): Promise<SteamGame[] | null> {
  try {
    const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const games = data?.response?.games;
    if (!games) return null;
    return games as SteamGame[];
  } catch {
    return null;
  }
}

export function detectPlatform(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("streamable.com")) return "streamable";
  if (url.includes("medal.tv")) return "medal";
  return "other";
}

export function getEmbedUrl(url: string, platform: string): string | null {
  if (platform === "youtube") {
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  if (platform === "streamable") {
    const sMatch = url.match(/streamable\.com\/([a-zA-Z0-9]+)/);
    if (sMatch) return `https://streamable.com/e/${sMatch[1]}`;
  }
  return null;
}

export function getSteamHeaderImage(appId: string): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}
