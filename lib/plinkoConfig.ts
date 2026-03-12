export type PlinkoRows = 8 | 12 | 16;
export type PlinkoRisk = "low" | "medium" | "high";

export const PLINKO_ROWS: PlinkoRows[] = [8, 12, 16];
export const PLINKO_RISKS: PlinkoRisk[] = ["low", "medium", "high"];

// Multiplier tables: index = bucket position (0 = far left, n = far right)
// Symmetric — edges are highest, center lowest
export const MULTIPLIERS: Record<PlinkoRows, Record<PlinkoRisk, number[]>> = {
  8: {
    low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    medium: [13,  3,   1.3, 0.7, 0.4, 0.7, 1.3, 3,   13],
    high:   [29,  4,   1.5, 0.3, 0.2, 0.3, 1.5, 4,   29],
  },
  12: {
    low:    [10,  3,   1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3,   10],
    medium: [33,  11,  4,   2,   1.1, 0.6, 0.3, 0.6, 1.1, 2,   4,   11,  33],
    high:   [170, 24,  8,   2,   0.7, 0.2, 0.2, 0.2, 0.7, 2,   8,   24,  170],
  },
  16: {
    low:    [16,  2,   1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 0.5, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2,   16],
    medium: [110, 41,  10,  5,   3,   1.5, 1.0, 0.5, 0.5, 0.5, 1.0, 1.5, 3,   5,   10,  41,  110],
    high:   [1000,130, 26,  9,   4,   2,   0.2, 0.2, 0.2, 0.2, 0.2, 2,   4,   9,   26,  130, 1000],
  },
};

export function bucketColor(mult: number): string {
  if (mult >= 100) return "#ffd700";
  if (mult >= 10)  return "#f97316";
  if (mult >= 3)   return "#eab308";
  if (mult >= 1.5) return "#22c55e";
  if (mult >= 0.5) return "#f59e0b";
  return "#ef4444";
}

export function formatMult(mult: number): string {
  if (mult >= 1000) return "1k×";
  return `${mult}×`;
}

export function dropBall(rows: PlinkoRows): { path: ("L" | "R")[]; bucketIdx: number } {
  const path: ("L" | "R")[] = [];
  let rights = 0;
  for (let r = 0; r < rows; r++) {
    const dir = Math.random() < 0.5 ? "L" : "R";
    path.push(dir);
    if (dir === "R") rights++;
  }
  return { path, bucketIdx: rights };
}

export const VALID_BETS = [10, 25, 50, 100, 250, 500] as const;
export type ValidBet = (typeof VALID_BETS)[number];
