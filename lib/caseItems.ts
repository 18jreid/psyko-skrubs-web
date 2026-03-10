export interface CaseItemDef {
  id: string;
  name: string;
  rarity: "mil-spec" | "restricted" | "classified" | "covert" | "rare-special";
  color: string;
  emoji: string;
  sellValue: number;
  weight: number;
}

export const CASE_ITEMS: CaseItemDef[] = [
  { id: "ms_1", name: "AK-47 | Redline (Battle-Scarred)",         rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1600 },
  { id: "ms_2", name: "M4A4 | Howl Wannabe (Field-Tested)",       rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1600 },
  { id: "ms_3", name: "AWP | Dragon Snore (Worn)",                 rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1600 },
  { id: "ms_4", name: "Glock-18 | Fade Attempt (Battle-Scarred)", rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1600 },
  { id: "ms_5", name: "MP5-SD | Lab Rats (Minimal Wear)",          rarity: "mil-spec",     color: "#4b69ff", emoji: "🔵", sellValue: 50,   weight: 1590 },
  { id: "r_1",  name: "AK-47 | Vulcan (Field-Tested)",             rarity: "restricted",   color: "#8847ff", emoji: "🟣", sellValue: 150,  weight: 400  },
  { id: "r_2",  name: "M4A1-S | Cyrex (Minimal Wear)",             rarity: "restricted",   color: "#8847ff", emoji: "🟣", sellValue: 150,  weight: 400  },
  { id: "r_3",  name: "AWP | Asiimov (Battle-Scarred)",            rarity: "restricted",   color: "#8847ff", emoji: "🟣", sellValue: 150,  weight: 400  },
  { id: "r_4",  name: "USP-S | Orion (Factory New)",               rarity: "restricted",   color: "#8847ff", emoji: "🟣", sellValue: 150,  weight: 390  },
  { id: "c_1",  name: "AK-47 | Fire Serpent (Field-Tested)",       rarity: "classified",   color: "#d32ce6", emoji: "🩷", sellValue: 400,  weight: 110  },
  { id: "c_2",  name: "StatTrak™ M4A4 | Howl (Battle-Scarred)",   rarity: "classified",   color: "#d32ce6", emoji: "🩷", sellValue: 400,  weight: 110  },
  { id: "c_3",  name: "Karambit | Doppler (Minimal Wear)",         rarity: "classified",   color: "#d32ce6", emoji: "🩷", sellValue: 400,  weight: 100  },
  { id: "cv_1", name: "AWP | Dragon Lore (Factory New)",           rarity: "covert",       color: "#eb4b4b", emoji: "🔴", sellValue: 1200, weight: 34   },
  { id: "cv_2", name: "StatTrak™ Butterfly Knife | Fade",          rarity: "covert",       color: "#eb4b4b", emoji: "🔴", sellValue: 1200, weight: 30   },
  { id: "rs_1", name: "★ Psyko Knife | Crimson Web",              rarity: "rare-special", color: "#ffd700", emoji: "⭐", sellValue: 5000, weight: 14   },
  { id: "rs_2", name: "★ StatTrak™ Karambit | Case Hardened",     rarity: "rare-special", color: "#ffd700", emoji: "⭐", sellValue: 5000, weight: 12   },
];

export const RARITY_LABEL: Record<string, string> = {
  "mil-spec":     "Mil-Spec Grade",
  "restricted":   "Restricted",
  "classified":   "Classified",
  "covert":       "Covert",
  "rare-special": "Rare Special ★",
};

export const CASE_COST = 100;

export function weightedRandom(): CaseItemDef {
  const total = CASE_ITEMS.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of CASE_ITEMS) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return CASE_ITEMS[CASE_ITEMS.length - 1];
}
