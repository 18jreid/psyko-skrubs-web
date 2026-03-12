export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { CASE_DROP_PROFILES } from "@/lib/caseItems";
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
  const caseIds = Object.keys(CASE_DROP_PROFILES);

  // Load all cached URLs from DB in one query
  const cached = await prisma.caseType.findMany({
    where: { id: { in: caseIds } },
    select: { id: true, imageUrl: true },
  });
  const cachedMap = Object.fromEntries(cached.map(r => [r.id, r.imageUrl]));

  const imageMap: Record<string, string | null> = {};
  const toFetch = caseIds.filter(id => !cachedMap[id]);

  for (const id of caseIds) {
    imageMap[id] = cachedMap[id] ?? null;
  }

  if (toFetch.length > 0) {
    const fetched = await Promise.all(
      toFetch.map(async id => ({
        id,
        imageUrl: await fetchSteamIcon(CASE_DROP_PROFILES[id].marketName),
      }))
    );

    await Promise.all(
      fetched.map(({ id, imageUrl }) => {
        imageMap[id] = imageUrl;
        if (!imageUrl) return Promise.resolve();
        return prisma.caseType.update({ where: { id }, data: { imageUrl } });
      })
    );
  }

  return NextResponse.json(imageMap);
}
