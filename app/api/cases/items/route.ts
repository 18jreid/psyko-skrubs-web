export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { CASE_ITEMS } from "@/lib/caseItems";
import { prisma } from "@/lib/prisma";

const CDN = "https://community.cloudflare.steamstatic.com/economy/image";

async function fetchSteamIcon(marketName: string): Promise<string | null> {
  try {
    const url = `https://steamcommunity.com/market/search/render/?appid=730&norender=1&count=1&query=${encodeURIComponent(marketName)}`;
    const res = await fetch(url, { headers: { "Accept-Language": "en-US,en;q=0.9" } });
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
  // Load all cached URLs from DB in one query
  const cached = await prisma.caseItem.findMany({ select: { id: true, imageUrl: true } });
  const cachedMap = Object.fromEntries(cached.map(r => [r.id, r.imageUrl]));

  const imageMap: Record<string, string | null> = {};
  const toFetch = CASE_ITEMS.filter(item => !cachedMap[item.id]);

  // Return cached URLs immediately; fetch missing ones from Steam
  for (const item of CASE_ITEMS) {
    imageMap[item.id] = cachedMap[item.id] ?? null;
  }

  if (toFetch.length > 0) {
    const fetched = await Promise.all(
      toFetch.map(async item => ({ id: item.id, imageUrl: await fetchSteamIcon(item.marketName) }))
    );

    // Persist to DB and update response
    await Promise.all(
      fetched.map(({ id, imageUrl }) => {
        imageMap[id] = imageUrl;
        if (!imageUrl) return Promise.resolve();
        return prisma.caseItem.update({ where: { id }, data: { imageUrl } });
      })
    );
  }

  return NextResponse.json(imageMap);
}
