export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { CASE_DROP_PROFILES } from "@/lib/caseItems";

const CDN = "https://community.cloudflare.steamstatic.com/economy/image";

async function fetchSteamIcon(marketName: string): Promise<string | null> {
  try {
    const url = `https://steamcommunity.com/market/search/render/?appid=730&norender=1&count=1&query=${encodeURIComponent(marketName)}`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const icon = data?.results?.[0]?.asset_description?.icon_url_large
      ?? data?.results?.[0]?.asset_description?.icon_url;
    return icon ? `${CDN}/${icon}/512fx384f` : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const entries = Object.entries(CASE_DROP_PROFILES);
  const results = await Promise.all(
    entries.map(async ([id, profile]) => ({
      id,
      imageUrl: await fetchSteamIcon(profile.marketName),
    }))
  );

  const imageMap: Record<string, string | null> = {};
  for (const r of results) imageMap[r.id] = r.imageUrl;

  return NextResponse.json(imageMap);
}
