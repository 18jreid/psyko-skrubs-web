export interface CaseItemDef {
  id: string;
  name: string;
  rarity: "mil-spec" | "restricted" | "classified" | "covert" | "rare-special";
  color: string;
  emoji: string;
  sellValue: number;
  weight: number;
  /** Real Steam Market hash name used to fetch the weapon image */
  marketName: string;
}

export const CASE_ITEMS: CaseItemDef[] = [
  { id: "ms_1", name: "AK-47 | Redline (Battle-Scarred)",         rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1600, marketName: "AK-47 | Redline (Field-Tested)" },
  { id: "ms_2", name: "M4A4 | Howl Wannabe (Field-Tested)",       rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1600, marketName: "M4A4 | Asiimov (Field-Tested)" },
  { id: "ms_3", name: "AWP | Dragon Snore (Worn)",                 rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1600, marketName: "AWP | Asiimov (Field-Tested)" },
  { id: "ms_4", name: "Glock-18 | Fade Attempt (Battle-Scarred)", rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1600, marketName: "Glock-18 | Fade (Factory New)" },
  { id: "ms_5", name: "MP5-SD | Lab Rats (Minimal Wear)",          rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1590, marketName: "MP5-SD | Lab Rats (Minimal Wear)" },
  { id: "r_1",  name: "AK-47 | Vulcan (Field-Tested)",             rarity: "restricted",   color: "#8847ff", emoji: "🟣", sellValue: 150,  weight: 400,  marketName: "AK-47 | Vulcan (Field-Tested)" },
  { id: "r_2",  name: "M4A1-S | Cyrex (Minimal Wear)",             rarity: "restricted",   color: "#8847ff", emoji: "🟣", sellValue: 150,  weight: 400,  marketName: "M4A1-S | Cyrex (Minimal Wear)" },
  { id: "r_3",  name: "AWP | Asiimov (Battle-Scarred)",            rarity: "restricted",   color: "#8847ff", emoji: "🟣", sellValue: 150,  weight: 400,  marketName: "AWP | Asiimov (Battle-Scarred)" },
  { id: "r_4",  name: "USP-S | Orion (Factory New)",               rarity: "restricted",   color: "#8847ff", emoji: "🟣", sellValue: 150,  weight: 390,  marketName: "USP-S | Orion (Factory New)" },
  { id: "c_1",  name: "AK-47 | Fire Serpent (Field-Tested)",       rarity: "classified",   color: "#d32ce6", emoji: "🩷", sellValue: 400,  weight: 110,  marketName: "AK-47 | Fire Serpent (Field-Tested)" },
  { id: "c_2",  name: "StatTrak™ M4A4 | Howl (Battle-Scarred)",   rarity: "classified",   color: "#d32ce6", emoji: "🩷", sellValue: 400,  weight: 110,  marketName: "M4A4 | Howl (Field-Tested)" },
  { id: "c_3",  name: "Karambit | Doppler (Minimal Wear)",         rarity: "classified",   color: "#d32ce6", emoji: "🩷", sellValue: 400,  weight: 100,  marketName: "★ Karambit | Doppler (Factory New)" },
  { id: "cv_1", name: "AWP | Dragon Lore (Factory New)",           rarity: "covert",       color: "#eb4b4b", emoji: "🔴", sellValue: 1200, weight: 34,   marketName: "AWP | Dragon Lore (Field-Tested)" },
  { id: "cv_2", name: "StatTrak™ Butterfly Knife | Fade",          rarity: "covert",       color: "#eb4b4b", emoji: "🔴", sellValue: 1200, weight: 30,   marketName: "★ Butterfly Knife | Fade (Factory New)" },
  { id: "rs_1", name: "★ Psyko Knife | Crimson Web",              rarity: "rare-special", color: "#ffd700", emoji: "⭐", sellValue: 5000, weight: 14,   marketName: "★ Karambit | Crimson Web (Factory New)" },
  { id: "rs_2", name: "★ StatTrak™ Karambit | Case Hardened",     rarity: "rare-special", color: "#ffd700", emoji: "⭐", sellValue: 5000, weight: 12,   marketName: "★ Karambit | Case Hardened (Factory New)" },
];

export const RARITY_LABEL: Record<string, string> = {
  "mil-spec":     "Mil-Spec Grade",
  "restricted":   "Restricted",
  "classified":   "Classified",
  "covert":       "Covert",
  "rare-special": "Rare Special ★",
};

export const CASE_COST = 100;

// ── Per-case drop rate definitions ──────────────────────────────────────────
// Each entry defines which rarity tiers are available and their relative weights.
// Tier weights are summed and used for a two-step roll:
//   1. Pick a tier by weight
//   2. Pick uniformly from items in that tier

export interface CaseDropProfile {
  tiers: Partial<Record<CaseItemDef["rarity"], number>>;
}

export const CASE_DROP_PROFILES: Record<string, CaseDropProfile> = {
  // Standard: full pool, CS2-accurate rates (~80% blue, ~16% purple, etc.)
  psyko_case_v1: {
    tiers: {
      "mil-spec":     79924,
      "restricted":   15985,
      "classified":    3197,
      "covert":         639,
      "rare-special":   255,
    },
  },
  // Restricted+: floor is Restricted (~78% purple, ~17% pink, ~4% red, ~1% gold)
  psyko_restricted_v1: {
    tiers: {
      "restricted":   78000,
      "classified":   17000,
      "covert":        4000,
      "rare-special":  1000,
    },
  },
  // Classified+: floor is Classified (~75% pink, ~20% red, ~5% gold)
  psyko_classified_v1: {
    tiers: {
      "classified":   75000,
      "covert":       20000,
      "rare-special":  5000,
    },
  },
  // Elite: Covert + Rare Special only (~78% red, ~22% gold)
  psyko_elite_v1: {
    tiers: {
      "covert":       78000,
      "rare-special": 22000,
    },
  },
};

/** Returns all items eligible for a given case type (used in UI for item pool preview). */
export function getItemsForCase(caseTypeId: string): CaseItemDef[] {
  const profile = CASE_DROP_PROFILES[caseTypeId];
  if (!profile) return CASE_ITEMS;
  const tiers = new Set(Object.keys(profile.tiers));
  return CASE_ITEMS.filter(i => tiers.has(i.rarity));
}

/** Weighted random drop for a specific case type. Falls back to full pool if unknown. */
export function weightedRandomForCase(caseTypeId: string): CaseItemDef {
  const profile = CASE_DROP_PROFILES[caseTypeId];
  if (!profile) return weightedRandom();

  const tierEntries = Object.entries(profile.tiers) as [CaseItemDef["rarity"], number][];
  const total = tierEntries.reduce((s, [, w]) => s + w, 0);

  // Step 1: pick rarity tier
  let r = Math.random() * total;
  let rarity: CaseItemDef["rarity"] = tierEntries[tierEntries.length - 1][0];
  for (const [tier, w] of tierEntries) {
    r -= w;
    if (r < 0) { rarity = tier; break; }
  }

  // Step 2: pick uniformly from items in that tier
  const pool = CASE_ITEMS.filter(i => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Legacy full-pool weighted random (used by direct case opening). */
export function weightedRandom(): CaseItemDef {
  return weightedRandomForCase("psyko_case_v1");
}
