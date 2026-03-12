export interface CaseItemDef {
  id: string;
  name: string;
  rarity: "mil-spec" | "restricted" | "classified" | "covert" | "rare-special";
  color: string;
  emoji: string;
  sellValue: number;
  weight: number;
  /** Exact Steam Community Market hash name for image fetching */
  marketName: string;
  /** Which purchasable case this item belongs to (undefined = legacy direct-open pool) */
  caseId?: string;
}

// ── Official CS2 rarity colors ────────────────────────────────────────────────
export const RARITY_COLOR: Record<string, string> = {
  "consumer":     "#b0c3d9",
  "industrial":   "#5e98d9",
  "mil-spec":     "#4b69ff",
  "restricted":   "#8847ff",
  "classified":   "#d32ce6",
  "covert":       "#eb4b4b",
  "contraband":   "#e4ae39",
  "rare-special": "#ffd700",
};

export const RARITY_LABEL: Record<string, string> = {
  "consumer":     "Consumer Grade",
  "industrial":   "Industrial Grade",
  "mil-spec":     "Mil-Spec Grade",
  "restricted":   "Restricted",
  "classified":   "Classified",
  "covert":       "Covert",
  "contraband":   "Contraband",
  "rare-special": "★ Rare Special",
};

// ── PsykoCoin ↔ USD conversion ────────────────────────────────────────────────
// Based on average CS2 Steam Market prices for the item tiers in our pool.
// Chroma Mil-Spec drops (~20-25 ₱ sell) map to ~$0.20 real → 1 ₱ ≈ $0.01
export const PSYKOCOIN_TO_USD = 0.01; // 100 ₱ = $1.00

export function toUSD(coins: number): string {
  const usd = coins * PSYKOCOIN_TO_USD;
  return "$" + usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Official CS2 drop rates (disclosed by Valve via Perfect World China, 2017)
// All cases share the same odds — value comes from the quality of items inside.
const CS2_TIER_WEIGHTS = {
  "mil-spec":     79924,
  "restricted":   15985,
  "classified":    3197,
  "covert":         639,
  "rare-special":   255,
} as const;
const CS2_TIER_TOTAL = Object.values(CS2_TIER_WEIGHTS).reduce((a, b) => a + b, 0);

// ── Legacy items (used by the direct 100₱ open — kept for backward compat) ───
const LEGACY_ITEMS: CaseItemDef[] = [
  { id: "ms_1", name: "AK-47 | Redline (Battle-Scarred)",         rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 50,   weight: 1600, marketName: "AK-47 | Redline (Field-Tested)" },
  { id: "ms_2", name: "M4A4 | Howl Wannabe (Field-Tested)",       rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 50,   weight: 1600, marketName: "M4A4 | Asiimov (Field-Tested)" },
  { id: "ms_3", name: "AWP | Dragon Snore (Worn)",                 rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 50,   weight: 1600, marketName: "AWP | Asiimov (Field-Tested)" },
  { id: "ms_4", name: "Glock-18 | Fade Attempt (Battle-Scarred)", rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 50,   weight: 1600, marketName: "Glock-18 | Fade (Factory New)" },
  { id: "ms_5", name: "MP5-SD | Lab Rats (Minimal Wear)",          rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 50,   weight: 1590, marketName: "MP5-SD | Lab Rats (Minimal Wear)" },
  { id: "r_1",  name: "AK-47 | Vulcan (Field-Tested)",             rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 150,  weight: 400,  marketName: "AK-47 | Vulcan (Field-Tested)" },
  { id: "r_2",  name: "M4A1-S | Cyrex (Minimal Wear)",             rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 150,  weight: 400,  marketName: "M4A1-S | Cyrex (Minimal Wear)" },
  { id: "r_3",  name: "AWP | Asiimov (Battle-Scarred)",            rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 150,  weight: 400,  marketName: "AWP | Asiimov (Battle-Scarred)" },
  { id: "r_4",  name: "USP-S | Orion (Factory New)",               rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 150,  weight: 390,  marketName: "USP-S | Orion (Factory New)" },
  { id: "c_1",  name: "AK-47 | Fire Serpent (Field-Tested)",       rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 400,  weight: 110,  marketName: "AK-47 | Fire Serpent (Field-Tested)" },
  { id: "c_2",  name: "StatTrak™ M4A4 | Howl (Battle-Scarred)",   rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 400,  weight: 110,  marketName: "M4A4 | Howl (Field-Tested)" },
  { id: "c_3",  name: "Karambit | Doppler (Minimal Wear)",         rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 400,  weight: 100,  marketName: "★ Karambit | Doppler (Factory New)" },
  { id: "cv_1", name: "AWP | Dragon Lore (Factory New)",           rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 1200, weight: 34,   marketName: "AWP | Dragon Lore (Field-Tested)" },
  { id: "cv_2", name: "StatTrak™ Butterfly Knife | Fade",          rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 1200, weight: 30,   marketName: "★ Butterfly Knife | Fade (Factory New)" },
  { id: "rs_1", name: "★ Psyko Knife | Crimson Web",              rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 5000, weight: 14,   marketName: "★ Karambit | Crimson Web (Factory New)" },
  { id: "rs_2", name: "★ StatTrak™ Karambit | Case Hardened",     rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 5000, weight: 12,   marketName: "★ Karambit | Case Hardened (Factory New)" },
];

// ── Chroma Case (psyko_case_v1) — 500 ₱ ──────────────────────────────────────
// Classic 2015 case. Sell values: ms≈20₱, r≈80₱, c≈400₱, cv≈2000₱, rs≈10000₱
const CHROMA_ITEMS: CaseItemDef[] = [
  // Mil-Spec
  { id: "chr_ms_1", caseId: "psyko_case_v1",      name: "Glock-18 | Catacombs (Field-Tested)",      rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 20,    weight: 1, marketName: "Glock-18 | Catacombs (Field-Tested)" },
  { id: "chr_ms_2", caseId: "psyko_case_v1",      name: "MP9 | Deadly Poison (Field-Tested)",        rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 20,    weight: 1, marketName: "MP9 | Deadly Poison (Field-Tested)" },
  { id: "chr_ms_3", caseId: "psyko_case_v1",      name: "SCAR-20 | Grotto (Minimal Wear)",           rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 25,    weight: 1, marketName: "SCAR-20 | Grotto (Minimal Wear)" },
  { id: "chr_ms_4", caseId: "psyko_case_v1",      name: "M249 | System Lock (Field-Tested)",         rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 15,    weight: 1, marketName: "M249 | System Lock (Field-Tested)" },
  { id: "chr_ms_5", caseId: "psyko_case_v1",      name: "XM1014 | Quicksilver (Field-Tested)",       rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 20,    weight: 1, marketName: "XM1014 | Quicksilver (Field-Tested)" },
  // Restricted
  { id: "chr_r_1",  caseId: "psyko_case_v1",      name: "Desert Eagle | Naga (Field-Tested)",        rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 90,    weight: 1, marketName: "Desert Eagle | Naga (Field-Tested)" },
  { id: "chr_r_2",  caseId: "psyko_case_v1",      name: "Sawed-Off | Serenity (Field-Tested)",       rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 70,    weight: 1, marketName: "Sawed-Off | Serenity (Field-Tested)" },
  { id: "chr_r_3",  caseId: "psyko_case_v1",      name: "MAC-10 | Malachite (Minimal Wear)",         rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 80,    weight: 1, marketName: "MAC-10 | Malachite (Minimal Wear)" },
  { id: "chr_r_4",  caseId: "psyko_case_v1",      name: "Dual Berettas | Urban Shock (Field-Tested)", rarity: "restricted",  color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 75,    weight: 1, marketName: "Dual Berettas | Urban Shock (Field-Tested)" },
  // Classified
  { id: "chr_c_1",  caseId: "psyko_case_v1",      name: "M4A4 | Dragon King (Field-Tested)",         rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 420,   weight: 1, marketName: "M4A4 | Dragon King (Field-Tested)" },
  { id: "chr_c_2",  caseId: "psyko_case_v1",      name: "AK-47 | Cartel (Field-Tested)",             rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 380,   weight: 1, marketName: "AK-47 | Cartel (Field-Tested)" },
  { id: "chr_c_3",  caseId: "psyko_case_v1",      name: "P250 | Muertos (Field-Tested)",             rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 350,   weight: 1, marketName: "P250 | Muertos (Field-Tested)" },
  // Covert
  { id: "chr_cv_1", caseId: "psyko_case_v1",      name: "AWP | Man-o'-war (Field-Tested)",           rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 2200,  weight: 1, marketName: "AWP | Man-o'-war (Field-Tested)" },
  { id: "chr_cv_2", caseId: "psyko_case_v1",      name: "Galil AR | Chatterbox (Field-Tested)",      rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 1800,  weight: 1, marketName: "Galil AR | Chatterbox (Field-Tested)" },
  // Rare Special — knife finishes
  { id: "chr_rs_1", caseId: "psyko_case_v1",      name: "★ Karambit | Doppler (Factory New)",        rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 12000, weight: 1, marketName: "★ Karambit | Doppler (Factory New)" },
  { id: "chr_rs_2", caseId: "psyko_case_v1",      name: "★ Bayonet | Tiger Tooth (Factory New)",     rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 8000,  weight: 1, marketName: "★ Bayonet | Tiger Tooth (Factory New)" },
];

// ── Revolution Case (psyko_restricted_v1) — 1,500 ₱ ──────────────────────────
// Released Feb 2023. ms≈80₱, r≈250₱, c≈1200₱, cv≈6000₱, rs≈30000₱
const REVOLUTION_ITEMS: CaseItemDef[] = [
  // Mil-Spec
  { id: "rev_ms_1", caseId: "psyko_restricted_v1", name: "MAG-7 | Insomnia (Field-Tested)",         rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 75,    weight: 1, marketName: "MAG-7 | Insomnia (Field-Tested)" },
  { id: "rev_ms_2", caseId: "psyko_restricted_v1", name: "MP9 | Featherweight (Field-Tested)",       rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 80,    weight: 1, marketName: "MP9 | Featherweight (Field-Tested)" },
  { id: "rev_ms_3", caseId: "psyko_restricted_v1", name: "SCAR-20 | Fragments (Field-Tested)",       rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 75,    weight: 1, marketName: "SCAR-20 | Fragments (Field-Tested)" },
  { id: "rev_ms_4", caseId: "psyko_restricted_v1", name: "P250 | Re.built (Minimal Wear)",           rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 90,    weight: 1, marketName: "P250 | Re.built (Minimal Wear)" },
  { id: "rev_ms_5", caseId: "psyko_restricted_v1", name: "MP5-SD | Liquidation (Field-Tested)",      rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 80,    weight: 1, marketName: "MP5-SD | Liquidation (Field-Tested)" },
  { id: "rev_ms_6", caseId: "psyko_restricted_v1", name: "SG 553 | Cyberforce (Field-Tested)",       rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 70,    weight: 1, marketName: "SG 553 | Cyberforce (Field-Tested)" },
  { id: "rev_ms_7", caseId: "psyko_restricted_v1", name: "Tec-9 | Rebel (Field-Tested)",             rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 75,    weight: 1, marketName: "Tec-9 | Rebel (Field-Tested)" },
  // Restricted
  { id: "rev_r_1",  caseId: "psyko_restricted_v1", name: "M4A1-S | Emphorosaur-S (Field-Tested)",   rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 280,   weight: 1, marketName: "M4A1-S | Emphorosaur-S (Field-Tested)" },
  { id: "rev_r_2",  caseId: "psyko_restricted_v1", name: "Glock-18 | Umbral Rabbit (Field-Tested)", rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 240,   weight: 1, marketName: "Glock-18 | Umbral Rabbit (Field-Tested)" },
  { id: "rev_r_3",  caseId: "psyko_restricted_v1", name: "MAC-10 | Sakkaku (Field-Tested)",          rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 220,   weight: 1, marketName: "MAC-10 | Sakkaku (Field-Tested)" },
  { id: "rev_r_4",  caseId: "psyko_restricted_v1", name: "R8 Revolver | Banana Cannon (Minimal Wear)", rarity: "restricted", color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 250,   weight: 1, marketName: "R8 Revolver | Banana Cannon (Minimal Wear)" },
  { id: "rev_r_5",  caseId: "psyko_restricted_v1", name: "P90 | Neoqueen (Field-Tested)",            rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 300,   weight: 1, marketName: "P90 | Neoqueen (Field-Tested)" },
  // Classified
  { id: "rev_c_1",  caseId: "psyko_restricted_v1", name: "AWP | Duality (Field-Tested)",             rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 1300,  weight: 1, marketName: "AWP | Duality (Field-Tested)" },
  { id: "rev_c_2",  caseId: "psyko_restricted_v1", name: "UMP-45 | Wild Child (Minimal Wear)",       rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 1100,  weight: 1, marketName: "UMP-45 | Wild Child (Minimal Wear)" },
  { id: "rev_c_3",  caseId: "psyko_restricted_v1", name: "P2000 | Wicked Sick (Field-Tested)",       rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 1200,  weight: 1, marketName: "P2000 | Wicked Sick (Field-Tested)" },
  // Covert
  { id: "rev_cv_1", caseId: "psyko_restricted_v1", name: "M4A4 | Temukau (Field-Tested)",            rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 6500,  weight: 1, marketName: "M4A4 | Temukau (Field-Tested)" },
  { id: "rev_cv_2", caseId: "psyko_restricted_v1", name: "AK-47 | Head Shot (Factory New)",          rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 5500,  weight: 1, marketName: "AK-47 | Head Shot (Factory New)" },
  // Rare Special — gloves
  { id: "rev_rs_1", caseId: "psyko_restricted_v1", name: "★ Sport Gloves | Pandora's Box (FN)",     rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 35000, weight: 1, marketName: "★ Sport Gloves | Pandora's Box (Factory New)" },
  { id: "rev_rs_2", caseId: "psyko_restricted_v1", name: "★ Hand Wraps | Cobalt Skulls (FN)",       rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 25000, weight: 1, marketName: "★ Hand Wraps | Cobalt Skulls (Factory New)" },
];

// ── Recoil Case (psyko_classified_v1) — 5,000 ₱ ──────────────────────────────
// Released June 2022. ms≈200₱, r≈800₱, c≈4500₱, cv≈20000₱, rs≈100000₱
const RECOIL_ITEMS: CaseItemDef[] = [
  // Mil-Spec
  { id: "rec_ms_1", caseId: "psyko_classified_v1", name: "M4A4 | Cyber Security (Field-Tested)",    rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 200,   weight: 1, marketName: "M4A4 | Cyber Security (Field-Tested)" },
  { id: "rec_ms_2", caseId: "psyko_classified_v1", name: "P250 | Vino Primo (Field-Tested)",         rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 180,   weight: 1, marketName: "P250 | Vino Primo (Field-Tested)" },
  { id: "rec_ms_3", caseId: "psyko_classified_v1", name: "FAMAS | Decommissioned (Minimal Wear)",    rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 220,   weight: 1, marketName: "FAMAS | Decommissioned (Minimal Wear)" },
  { id: "rec_ms_4", caseId: "psyko_classified_v1", name: "G3SG1 | Styx (Field-Tested)",              rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 190,   weight: 1, marketName: "G3SG1 | Styx (Field-Tested)" },
  { id: "rec_ms_5", caseId: "psyko_classified_v1", name: "Desert Eagle | Blue Ply (Field-Tested)",   rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 210,   weight: 1, marketName: "Desert Eagle | Blue Ply (Field-Tested)" },
  { id: "rec_ms_6", caseId: "psyko_classified_v1", name: "PP-Bizon | Fuel Rod (Minimal Wear)",       rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 175,   weight: 1, marketName: "PP-Bizon | Fuel Rod (Minimal Wear)" },
  { id: "rec_ms_7", caseId: "psyko_classified_v1", name: "Nova | Sobek (Field-Tested)",              rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 185,   weight: 1, marketName: "Nova | Sobek (Field-Tested)" },
  // Restricted
  { id: "rec_r_1",  caseId: "psyko_classified_v1", name: "Glock-18 | Winterized (Field-Tested)",    rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 850,   weight: 1, marketName: "Glock-18 | Winterized (Field-Tested)" },
  { id: "rec_r_2",  caseId: "psyko_classified_v1", name: "M249 | Downtown (Field-Tested)",           rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 750,   weight: 1, marketName: "M249 | Downtown (Field-Tested)" },
  { id: "rec_r_3",  caseId: "psyko_classified_v1", name: "MAC-10 | Alloy (Minimal Wear)",            rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 780,   weight: 1, marketName: "MAC-10 | Alloy (Minimal Wear)" },
  { id: "rec_r_4",  caseId: "psyko_classified_v1", name: "R8 Revolver | Crazy 8 (Field-Tested)",    rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 900,   weight: 1, marketName: "R8 Revolver | Crazy 8 (Field-Tested)" },
  { id: "rec_r_5",  caseId: "psyko_classified_v1", name: "M4A1-S | Nightmare (Field-Tested)",        rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 820,   weight: 1, marketName: "M4A1-S | Nightmare (Field-Tested)" },
  // Classified
  { id: "rec_c_1",  caseId: "psyko_classified_v1", name: "AK-47 | Ice Coaled (Field-Tested)",        rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 5000,  weight: 1, marketName: "AK-47 | Ice Coaled (Field-Tested)" },
  { id: "rec_c_2",  caseId: "psyko_classified_v1", name: "Sawed-Off | Kiss♥Love (Factory New)",      rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 4000,  weight: 1, marketName: "Sawed-Off | Kiss♥Love (Factory New)" },
  { id: "rec_c_3",  caseId: "psyko_classified_v1", name: "P250 | Visions (Field-Tested)",            rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 4500,  weight: 1, marketName: "P250 | Visions (Field-Tested)" },
  // Covert
  { id: "rec_cv_1", caseId: "psyko_classified_v1", name: "USP-S | Printstream (Factory New)",        rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 25000, weight: 1, marketName: "USP-S | Printstream (Factory New)" },
  { id: "rec_cv_2", caseId: "psyko_classified_v1", name: "AWP | Chromatic Aberration (Field-Tested)", rarity: "covert",      color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 15000, weight: 1, marketName: "AWP | Chromatic Aberration (Field-Tested)" },
  // Rare Special — gloves
  { id: "rec_rs_1", caseId: "psyko_classified_v1", name: "★ Specialist Gloves | Marble Fade (FN)",  rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 120000, weight: 1, marketName: "★ Specialist Gloves | Marble Fade (Factory New)" },
  { id: "rec_rs_2", caseId: "psyko_classified_v1", name: "★ Sport Gloves | Slingshot (Factory New)", rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 80000, weight: 1, marketName: "★ Sport Gloves | Slingshot (Factory New)" },
];

// ── Kilowatt Case (psyko_elite_v1) — 15,000 ₱ ────────────────────────────────
// Released Feb 2024 (first CS2-exclusive case). ms≈600₱, r≈2500₱, c≈12000₱, cv≈60000₱, rs≈300000₱
const KILOWATT_ITEMS: CaseItemDef[] = [
  // Mil-Spec
  { id: "kw_ms_1", caseId: "psyko_elite_v1",      name: "Dual Berettas | Hideout (Field-Tested)",   rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 600,    weight: 1, marketName: "Dual Berettas | Hideout (Field-Tested)" },
  { id: "kw_ms_2", caseId: "psyko_elite_v1",      name: "MAC-10 | Light Box (Minimal Wear)",         rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 650,    weight: 1, marketName: "MAC-10 | Light Box (Minimal Wear)" },
  { id: "kw_ms_3", caseId: "psyko_elite_v1",      name: "Nova | Dark Sigil (Field-Tested)",          rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 580,    weight: 1, marketName: "Nova | Dark Sigil (Field-Tested)" },
  { id: "kw_ms_4", caseId: "psyko_elite_v1",      name: "SSG 08 | Dezastre (Field-Tested)",          rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 620,    weight: 1, marketName: "SSG 08 | Dezastre (Field-Tested)" },
  { id: "kw_ms_5", caseId: "psyko_elite_v1",      name: "Tec-9 | Slag (Field-Tested)",               rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 560,    weight: 1, marketName: "Tec-9 | Slag (Field-Tested)" },
  { id: "kw_ms_6", caseId: "psyko_elite_v1",      name: "UMP-45 | Motorized (Minimal Wear)",         rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 640,    weight: 1, marketName: "UMP-45 | Motorized (Minimal Wear)" },
  { id: "kw_ms_7", caseId: "psyko_elite_v1",      name: "XM1014 | Irezumi (Field-Tested)",           rarity: "mil-spec",     color: RARITY_COLOR["mil-spec"],     emoji: "🔵", sellValue: 590,    weight: 1, marketName: "XM1014 | Irezumi (Field-Tested)" },
  // Restricted
  { id: "kw_r_1",  caseId: "psyko_elite_v1",      name: "Glock-18 | Block-18 (Factory New)",         rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 2800,   weight: 1, marketName: "Glock-18 | Block-18 (Factory New)" },
  { id: "kw_r_2",  caseId: "psyko_elite_v1",      name: "M4A4 | Etch Lord (Field-Tested)",           rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 2200,   weight: 1, marketName: "M4A4 | Etch Lord (Field-Tested)" },
  { id: "kw_r_3",  caseId: "psyko_elite_v1",      name: "Five-SeveN | Hybrid (Minimal Wear)",        rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 2500,   weight: 1, marketName: "Five-SeveN | Hybrid (Minimal Wear)" },
  { id: "kw_r_4",  caseId: "psyko_elite_v1",      name: "MP7 | Just Smile (Field-Tested)",           rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 2000,   weight: 1, marketName: "MP7 | Just Smile (Field-Tested)" },
  { id: "kw_r_5",  caseId: "psyko_elite_v1",      name: "Sawed-Off | Analog Input (Factory New)",    rarity: "restricted",   color: RARITY_COLOR["restricted"],   emoji: "🟣", sellValue: 2400,   weight: 1, marketName: "Sawed-Off | Analog Input (Factory New)" },
  // Classified
  { id: "kw_c_1",  caseId: "psyko_elite_v1",      name: "M4A1-S | Black Lotus (Factory New)",        rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 14000,  weight: 1, marketName: "M4A1-S | Black Lotus (Factory New)" },
  { id: "kw_c_2",  caseId: "psyko_elite_v1",      name: "Zeus x27 | Olympus (Minimal Wear)",         rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 10000,  weight: 1, marketName: "Zeus x27 | Olympus (Minimal Wear)" },
  { id: "kw_c_3",  caseId: "psyko_elite_v1",      name: "USP-S | Jawbreaker (Field-Tested)",         rarity: "classified",   color: RARITY_COLOR["classified"],   emoji: "🩷", sellValue: 12000,  weight: 1, marketName: "USP-S | Jawbreaker (Field-Tested)" },
  // Covert
  { id: "kw_cv_1", caseId: "psyko_elite_v1",      name: "AK-47 | Inheritance (Factory New)",         rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 70000,  weight: 1, marketName: "AK-47 | Inheritance (Factory New)" },
  { id: "kw_cv_2", caseId: "psyko_elite_v1",      name: "AWP | Chrome Cannon (Factory New)",         rarity: "covert",       color: RARITY_COLOR["covert"],       emoji: "🔴", sellValue: 50000,  weight: 1, marketName: "AWP | Chrome Cannon (Factory New)" },
  // Rare Special — Kukri knife finishes
  { id: "kw_rs_1", caseId: "psyko_elite_v1",      name: "★ Kukri Knife | Fade (Factory New)",        rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 350000, weight: 1, marketName: "★ Kukri Knife | Fade (Factory New)" },
  { id: "kw_rs_2", caseId: "psyko_elite_v1",      name: "★ Kukri Knife | Crimson Web (Factory New)", rarity: "rare-special", color: RARITY_COLOR["rare-special"], emoji: "⭐", sellValue: 250000, weight: 1, marketName: "★ Kukri Knife | Crimson Web (Factory New)" },
];

/** All items combined — exported for DB seeding and the image API. */
export const CASE_ITEMS: CaseItemDef[] = [
  ...LEGACY_ITEMS,
  ...CHROMA_ITEMS,
  ...REVOLUTION_ITEMS,
  ...RECOIL_ITEMS,
  ...KILOWATT_ITEMS,
];

export const CASE_COST = 100;

// ── Float generation ──────────────────────────────────────────────────────────
export const WEAR_RANGES: Record<string, [number, number]> = {
  "Factory New":    [0.00, 0.07],
  "Minimal Wear":   [0.07, 0.15],
  "Field-Tested":   [0.15, 0.38],
  "Well-Worn":      [0.38, 0.45],
  "Battle-Scarred": [0.45, 1.00],
};

export function getWearFromName(name: string): string {
  for (const wear of Object.keys(WEAR_RANGES)) {
    if (name.includes(wear)) return wear;
  }
  return "Field-Tested";
}

export function generateFloat(itemName: string): number {
  const wear = getWearFromName(itemName);
  const [min, max] = WEAR_RANGES[wear];
  return parseFloat((Math.random() * (max - min) + min).toFixed(10));
}

// ── Per-case drop profiles ────────────────────────────────────────────────────
// All CS2 cases share identical tier drop rates (official Valve disclosure).
// Value differences come entirely from the quality of items inside each case.
export interface CaseDropProfile {
  tiers: Partial<Record<CaseItemDef["rarity"], number>>;
  marketName: string;
}

export const CASE_DROP_PROFILES: Record<string, CaseDropProfile> = {
  psyko_case_v1:       { tiers: { ...CS2_TIER_WEIGHTS }, marketName: "Chroma Case" },
  psyko_restricted_v1: { tiers: { ...CS2_TIER_WEIGHTS }, marketName: "Revolution Case" },
  psyko_classified_v1: { tiers: { ...CS2_TIER_WEIGHTS }, marketName: "Recoil Case" },
  psyko_elite_v1:      { tiers: { ...CS2_TIER_WEIGHTS }, marketName: "Kilowatt Case" },
};

/** Items eligible for a given purchasable case type. */
export function getItemsForCase(caseTypeId: string): CaseItemDef[] {
  return CASE_ITEMS.filter(i => i.caseId === caseTypeId);
}

/**
 * Weighted drop for a specific purchasable case type.
 * Uses CS2-accurate two-step roll: pick rarity tier, then pick uniformly within that tier.
 */
export function weightedRandomForCase(caseTypeId: string): CaseItemDef {
  const pool = getItemsForCase(caseTypeId);
  if (pool.length === 0) return weightedRandom();

  const profile = CASE_DROP_PROFILES[caseTypeId];
  const tierEntries = profile
    ? (Object.entries(profile.tiers) as [CaseItemDef["rarity"], number][])
    : (Object.entries(CS2_TIER_WEIGHTS) as [CaseItemDef["rarity"], number][]);

  // Filter to only tiers that have items in this case
  const availableTiers = new Set(pool.map(i => i.rarity));
  const activeTiers = tierEntries.filter(([t]) => availableTiers.has(t));
  const total = activeTiers.reduce((s, [, w]) => s + w, 0);

  let r = Math.random() * total;
  let rarity: CaseItemDef["rarity"] = activeTiers[activeTiers.length - 1][0];
  for (const [tier, w] of activeTiers) {
    r -= w;
    if (r < 0) { rarity = tier; break; }
  }

  const tierPool = pool.filter(i => i.rarity === rarity);
  return tierPool[Math.floor(Math.random() * tierPool.length)];
}

/** Legacy full-pool drop — used by the direct 100 ₱ "Open Case" button. */
export function weightedRandom(): CaseItemDef {
  const pool = LEGACY_ITEMS;
  const total = pool.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return pool[pool.length - 1];
}
