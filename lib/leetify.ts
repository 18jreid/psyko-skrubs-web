export interface LeetifyStats {
  leetifyRating: number | null;
  ctRating: number | null;
  tRating: number | null;
  aim: number | null;
  positioning: number | null;
  utility: number | null;
  openingDuels: number | null;
  clutch: number | null;
  recentMatches: LeetifyMatch[];
}

export interface LeetifyMatch {
  matchedAt: string;
  mapName: string;
  won: boolean | null;
  leetifyRating: number | null;
  hltvRating: number | null;
  kills: number;
  deaths: number;
  assists: number;
}

export async function getLeetifyStats(
  steamId: string,
  token?: string | null
): Promise<LeetifyStats | null> {
  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(
      `https://api.leetify.com/api/profile/${steamId}`,
      { headers, next: { revalidate: 300 } }
    );

    if (!res.ok) return null;
    const data = await res.json();

    // Extract ratings from the response
    const rating = data?.leetifyRating ?? data?.rating ?? null;
    const ctRating = data?.ctLeetifyRating ?? data?.ctRating ?? null;
    const tRating = data?.tLeetifyRating ?? data?.tRating ?? null;

    // Sub-ratings (if available)
    const aim = data?.aim ?? null;
    const positioning = data?.positioning ?? null;
    const utility = data?.utility ?? null;
    const openingDuels = data?.openingDuels ?? null;
    const clutch = data?.clutch ?? null;

    // Recent matches
    const rawGames: Record<string, unknown>[] = Array.isArray(data?.games)
      ? data.games.slice(0, 10)
      : [];

    const recentMatches: LeetifyMatch[] = rawGames.map((g) => ({
      matchedAt: (g.matchedAt as string) ?? "",
      mapName: (g.mapName as string) ?? "Unknown",
      won: g.won !== undefined ? Boolean(g.won) : null,
      leetifyRating:
        typeof g.leetifyRating === "number" ? g.leetifyRating : null,
      hltvRating: typeof g.hltvRating === "number" ? g.hltvRating : null,
      kills: Number(g.kills ?? 0),
      deaths: Number(g.deaths ?? 0),
      assists: Number(g.assists ?? 0),
    }));

    return {
      leetifyRating: typeof rating === "number" ? rating : null,
      ctRating: typeof ctRating === "number" ? ctRating : null,
      tRating: typeof tRating === "number" ? tRating : null,
      aim: typeof aim === "number" ? aim : null,
      positioning: typeof positioning === "number" ? positioning : null,
      utility: typeof utility === "number" ? utility : null,
      openingDuels:
        typeof openingDuels === "number" ? openingDuels : null,
      clutch: typeof clutch === "number" ? clutch : null,
      recentMatches,
    };
  } catch {
    return null;
  }
}
