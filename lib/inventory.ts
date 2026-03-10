const SKINPORT_URL =
  "https://api.skinport.com/v1/items?app_id=730&currency=USD";
const INVENTORY_URL = "https://steamcommunity.com/inventory";

// In-memory caches
let priceCache: { data: Record<string, number>; timestamp: number } | null =
  null;
const inventoryCache = new Map<
  string,
  { value: number; itemCount: number; timestamp: number }
>();

const PRICE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const INVENTORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface SkinportItem {
  market_hash_name: string;
  min_price: number | null;
  suggested_price: number | null;
}

interface InventoryAsset {
  classid: string;
  instanceid: string;
  amount: string;
}

interface InventoryDescription {
  classid: string;
  instanceid: string;
  market_hash_name?: string;
  marketable?: number;
}

interface InventoryResponse {
  success: number;
  assets?: InventoryAsset[];
  descriptions?: InventoryDescription[];
  total_inventory_count?: number;
}

async function getPrices(): Promise<Record<string, number>> {
  if (priceCache && Date.now() - priceCache.timestamp < PRICE_CACHE_TTL) {
    return priceCache.data;
  }
  const res = await fetch(SKINPORT_URL, {
    headers: { "Accept-Encoding": "br, gzip, deflate" },
  });
  if (!res.ok) throw new Error(`Failed to fetch prices: ${res.status}`);
  const items: SkinportItem[] = await res.json();

  // Build a map of market_hash_name -> price
  const data: Record<string, number> = {};
  for (const item of items) {
    const price = item.suggested_price ?? item.min_price ?? 0;
    if (price > 0) {
      data[item.market_hash_name] = price;
    }
  }

  priceCache = { data, timestamp: Date.now() };
  return data;
}

export interface InventoryValue {
  value: number;
  itemCount: number;
}

export async function getInventoryValue(
  steamId: string
): Promise<InventoryValue | null> {
  const cached = inventoryCache.get(steamId);
  if (cached && Date.now() - cached.timestamp < INVENTORY_CACHE_TTL) {
    return { value: cached.value, itemCount: cached.itemCount };
  }

  try {
    const prices = await getPrices();

    const allAssets: InventoryAsset[] = [];
    const descMap = new Map<string, InventoryDescription>();
    let startAssetId: string | undefined;

    // Paginate through inventory (Steam limits per-request count)
    for (let page = 0; page < 20; page++) {
      let url = `${INVENTORY_URL}/${steamId}/730/2?l=english&count=500`;
      if (startAssetId) url += `&start_assetid=${startAssetId}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://steamcommunity.com",
        },
      });

      if (!res.ok) return null;
      const data: InventoryResponse = await res.json();
      if (!data.success || !data.assets) break;

      allAssets.push(...data.assets);
      if (data.descriptions) {
        for (const desc of data.descriptions) {
          descMap.set(`${desc.classid}_${desc.instanceid}`, desc);
        }
      }

      // Check if there are more pages
      const raw = data as InventoryResponse & { last_assetid?: string };
      if (!raw.last_assetid || data.assets.length < 500) break;
      startAssetId = raw.last_assetid;
    }

    if (allAssets.length === 0) return null;

    let totalValue = 0;
    let itemCount = 0;

    for (const asset of allAssets) {
      const desc = descMap.get(`${asset.classid}_${asset.instanceid}`);
      if (!desc?.market_hash_name) continue;

      itemCount++;
      totalValue += prices[desc.market_hash_name] ?? 0;
    }

    totalValue = Math.round(totalValue * 100) / 100;

    inventoryCache.set(steamId, {
      value: totalValue,
      itemCount,
      timestamp: Date.now(),
    });
    return { value: totalValue, itemCount };
  } catch {
    return null;
  }
}

export async function getAllInventoryValues(
  steamIds: string[]
): Promise<Record<string, InventoryValue | null>> {
  // Pre-fetch prices once so all inventory lookups share the cache
  await getPrices();

  const results = await Promise.all(
    steamIds.map(async (steamId) => ({
      steamId,
      inventory: await getInventoryValue(steamId),
    }))
  );

  const map: Record<string, InventoryValue | null> = {};
  for (const r of results) {
    map[r.steamId] = r.inventory;
  }
  return map;
}
