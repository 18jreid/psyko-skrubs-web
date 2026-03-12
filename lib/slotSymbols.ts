export interface SlotSymbol {
  id: string;
  label: string;
  weight: number;
  color: string;
  /** Text rendered inside the reel cell */
  display: string;
  isText?: boolean; // true = render as styled text, false = emoji
}

// Ordered rarest → most common
export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: "jackpot", display: "🎰", label: "JACKPOT",  weight: 1,  color: "#ffd700" },
  { id: "diamond", display: "💎", label: "Diamond",  weight: 2,  color: "#67e8f9" },
  { id: "seven",   display: "7",  label: "Lucky 7",  weight: 3,  color: "#ef4444", isText: true },
  { id: "bell",    display: "🔔", label: "Bell",     weight: 6,  color: "#eab308" },
  { id: "star",    display: "⭐", label: "Star",     weight: 8,  color: "#f97316" },
  { id: "cherry",  display: "🍒", label: "Cherry",   weight: 10, color: "#dc2626" },
  { id: "bar",     display: "BAR", label: "BAR",     weight: 10, color: "#a78bfa", isText: true },
  { id: "lemon",   display: "🍋", label: "Lemon",   weight: 15, color: "#ca8a04" },
  { id: "orange",  display: "🍊", label: "Orange",  weight: 15, color: "#ea580c" },
];

// Multipliers: { three: X } = 3-of-a-kind, { two: X } = first two reels match
export const SLOT_PAYOUTS: Record<string, { three: number; two?: number }> = {
  jackpot: { three: 500, two: 50  },
  diamond: { three: 150, two: 15  },
  seven:   { three: 75,  two: 8   },
  bell:    { three: 20,  two: 4   },
  star:    { three: 12,  two: 2   },
  cherry:  { three: 7,   two: 1.5 },
  bar:     { three: 4,   two: 1.5 },
  lemon:   { three: 3             },
  orange:  { three: 2             },
};

// Any single cherry anywhere = half bet back
export const CHERRY_CONSOLATION = 0.5;

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

export function randomSymbolId(): string {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SLOT_SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym.id;
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1].id;
}

export function getSymbol(id: string): SlotSymbol {
  return SLOT_SYMBOLS.find(s => s.id === id) ?? SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

export interface PayoutResult {
  multiplier: number;
  winType: string | null;
}

export function calcPayout(reels: [string, string, string]): PayoutResult {
  const [a, b, c] = reels;

  // 3 of a kind
  if (a === b && b === c) {
    return { multiplier: SLOT_PAYOUTS[a]?.three ?? 0, winType: `triple-${a}` };
  }

  // Pair on reels 1+2 — full pair payout
  if (a === b && SLOT_PAYOUTS[a]?.two !== undefined) {
    return { multiplier: SLOT_PAYOUTS[a].two!, winType: `pair-${a}` };
  }

  // Pair on reels 2+3 — half pair payout
  if (b === c && SLOT_PAYOUTS[b]?.two !== undefined) {
    return { multiplier: SLOT_PAYOUTS[b].two! / 2, winType: `pair23-${b}` };
  }

  // Any single cherry anywhere — half bet back
  if (a === "cherry" || b === "cherry" || c === "cherry") {
    return { multiplier: CHERRY_CONSOLATION, winType: "cherry" };
  }

  return { multiplier: 0, winType: null };
}

export const VALID_BETS = [10, 25, 50, 100, 250, 500] as const;
export type ValidBet = typeof VALID_BETS[number];
