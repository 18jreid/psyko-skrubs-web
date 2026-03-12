"use client";

import { useState, useEffect } from "react";
import { toUSD } from "@/lib/caseItems";
import {
  MULTIPLIERS, VALID_BETS, bucketColor, formatMult,
  type PlinkoRows, type PlinkoRisk,
} from "@/lib/plinkoConfig";

// ── Board layout ────────────────────────────────────────────────────────────
const SVG_W = 520;
const MARGIN_X = 20;
// PEG_SPACING fills the board width evenly based on row count
// All boards share the same left/right edge at x=20 and x=500
function pegSpacing(rows: PlinkoRows) {
  return (SVG_W - 2 * MARGIN_X) / rows;
}
function rowHeight(rows: PlinkoRows) {
  return rows === 8 ? 52 : rows === 12 ? 42 : 34;
}
function pegRadius(rows: PlinkoRows) {
  return rows === 8 ? 5 : rows === 12 ? 4.5 : 4;
}
function ballRadius(rows: PlinkoRows) {
  return rows === 8 ? 8 : rows === 12 ? 7 : 6;
}

const PEG_START_Y = 40;
const BUCKET_H = 32;
const BUCKET_GAP = 2; // px gap each side of bucket
const CENTER_X = SVG_W / 2;

function svgHeight(rows: PlinkoRows) {
  const bucketY = PEG_START_Y + rows * rowHeight(rows) + 10;
  return bucketY + BUCKET_H + 16;
}
function bucketY(rows: PlinkoRows) {
  return PEG_START_Y + rows * rowHeight(rows) + 10;
}

// Ball x-position after `rights` right-bounces, at row `r` (before bouncing in that row)
// Formula: CENTER_X + (rights - r/2) * PEG_SPACING
function ballX(rights: number, r: number, rows: PlinkoRows) {
  return CENTER_X + (rights - r / 2) * pegSpacing(rows);
}

// Waypoints: one per row (at peg level) + start above + final bucket landing
function computeWaypoints(path: ("L" | "R")[], rows: PlinkoRows) {
  const pts: { x: number; y: number }[] = [];
  const PS = pegSpacing(rows);
  const RH = rowHeight(rows);
  const BY = bucketY(rows);

  let rights = 0;
  pts.push({ x: CENTER_X, y: PEG_START_Y - 22 }); // above board

  for (let r = 0; r < rows; r++) {
    pts.push({ x: ballX(rights, r, rows), y: PEG_START_Y + r * RH });
    if (path[r] === "R") rights++;
  }

  // Final landing — bucket center
  const finalX = CENTER_X + (rights - rows / 2) * PS;
  pts.push({ x: finalX, y: BY + BUCKET_H / 2 });

  return pts;
}

// ── Step timing (ms per waypoint) ──────────────────────────────────────────
function stepTime(rows: PlinkoRows) {
  return rows === 8 ? 130 : rows === 12 ? 105 : 85;
}
// CSS transition duration slightly shorter than step time for crisp movement
function transitionMs(rows: PlinkoRows) {
  return rows === 8 ? 110 : rows === 12 ? 90 : 72;
}

// ── Drop result type ────────────────────────────────────────────────────────
interface DropResult {
  path: ("L" | "R")[];
  bucketIdx: number;
  multiplier: number;
  bet: number;
  winnings: number;
  delta: number;
  balance: number;
}

// ── PlinkoBoard component ───────────────────────────────────────────────────
function PlinkoBoard({
  rows,
  risk,
  result,
  animKey,
  onAnimationComplete,
}: {
  rows: PlinkoRows;
  risk: PlinkoRisk;
  result: DropResult | null;
  animKey: number;
  onAnimationComplete: () => void;
}) {
  const mults = MULTIPLIERS[rows][risk];
  const numBuckets = rows + 1;
  const PS = pegSpacing(rows);
  const RH = rowHeight(rows);
  const PR = pegRadius(rows);
  const BR = ballRadius(rows);
  const BY = bucketY(rows);
  const SH = svgHeight(rows);
  const bucketWidth = PS - BUCKET_GAP * 2;

  const [ballPos, setBallPos] = useState({ x: CENTER_X, y: -30 });
  const [ballVisible, setBallVisible] = useState(false);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);

  useEffect(() => {
    if (animKey === 0 || !result) return;

    const waypoints = computeWaypoints(result.path, rows);
    setBallPos(waypoints[0]);
    setBallVisible(true);
    setActiveBucket(null);

    let step = 1;
    const ST = stepTime(rows);

    const advance = () => {
      if (step < waypoints.length) {
        setBallPos(waypoints[step]);
        step++;
        setTimeout(advance, ST);
      } else {
        setActiveBucket(result.bucketIdx);
        setTimeout(onAnimationComplete, 350);
      }
    };

    setTimeout(advance, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  // Peg grid: row r has r+2 pegs
  const pegs: { x: number; y: number; k: string }[] = [];
  for (let r = 0; r < rows; r++) {
    const numPegs = r + 2;
    const y = PEG_START_Y + r * RH;
    for (let j = 0; j < numPegs; j++) {
      const x = CENTER_X + (j - (numPegs - 1) / 2) * PS;
      pegs.push({ x, y, k: `${r}-${j}` });
    }
  }

  // Buckets
  const buckets = Array.from({ length: numBuckets }, (_, b) => {
    const cx = CENTER_X + (b - (numBuckets - 1) / 2) * PS;
    const mult = mults[b];
    const color = bucketColor(mult);
    const isActive = activeBucket === b;
    return { cx, x: cx - bucketWidth / 2, width: bucketWidth, mult, color, isActive };
  });

  const TMS = transitionMs(rows);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SH}`}
      width="100%"
      style={{ display: "block" }}
    >
      {/* Board background */}
      <rect width={SVG_W} height={SH} fill="#05050c" rx={10} />

      {/* Peg rows — staggered triangle grid */}
      {pegs.map(({ x, y, k }) => (
        <circle
          key={k}
          cx={x}
          cy={y}
          r={PR}
          fill="#e2e8f030"
          stroke="#e2e8f020"
          strokeWidth={1}
        />
      ))}

      {/* Buckets */}
      {buckets.map(({ cx, x, width, mult, color, isActive }, b) => {
        const fs = PS < 32 ? 8 : PS < 45 ? 9 : 10;
        return (
          <g key={b}>
            <rect
              x={x}
              y={BY}
              width={width}
              height={BUCKET_H}
              rx={3}
              fill={isActive ? color : `${color}22`}
              stroke={isActive ? color : `${color}88`}
              strokeWidth={isActive ? 2 : 1}
              style={{ transition: "fill 0.25s, stroke-width 0.25s" }}
            />
            {isActive && (
              <rect
                x={x - 1}
                y={BY - 1}
                width={width + 2}
                height={BUCKET_H + 2}
                rx={4}
                fill="none"
                stroke={color}
                strokeWidth={2}
                opacity={0.5}
                style={{ filter: `drop-shadow(0 0 8px ${color})` }}
              />
            )}
            <text
              x={cx}
              y={BY + BUCKET_H / 2 + 4}
              textAnchor="middle"
              fill={isActive ? (mult >= 3 ? "#000" : "#fff") : color}
              fontSize={fs}
              fontWeight="bold"
              fontFamily="monospace"
              style={{ transition: "fill 0.25s" }}
            >
              {formatMult(mult)}
            </text>
          </g>
        );
      })}

      {/* Animated ball */}
      {ballVisible && (
        <g
          style={{
            transform: `translate(${ballPos.x}px, ${ballPos.y}px)`,
            transition: `transform ${TMS}ms ease-in-out`,
          }}
        >
          <circle
            cx={0}
            cy={0}
            r={BR}
            fill="#f97316"
            stroke="#fed7aa"
            strokeWidth={1.5}
            style={{ filter: "drop-shadow(0 0 8px #f97316bb)" }}
          />
        </g>
      )}
    </svg>
  );
}

// ── Risk color map ──────────────────────────────────────────────────────────
const RISK_COLOR: Record<PlinkoRisk, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

// ── Page ────────────────────────────────────────────────────────────────────
export default function PlinkoPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [rows, setRows] = useState<PlinkoRows>(16);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [bet, setBet] = useState(50);
  const [isDropping, setIsDropping] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [result, setResult] = useState<DropResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cases/balance")
      .then(r => r.json())
      .then(d => { if (d.balance !== null) setBalance(d.balance); });
  }, []);

  const drop = async () => {
    if (isDropping) return;
    setError(null);
    setShowResult(false);
    setIsDropping(true);

    const res = await fetch("/api/plinko/drop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet, rows, risk }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error");
      setIsDropping(false);
      return;
    }

    setBalance(prev => prev === null ? null : prev - bet);
    setResult(data);
    setAnimKey(k => k + 1);
  };

  const handleAnimationComplete = () => {
    if (result) setBalance(result.balance);
    setShowResult(true);
    setIsDropping(false);
  };

  const canDrop = !isDropping && balance !== null && balance >= bet;

  // Max multiplier for current settings (the edge bucket)
  const maxMult = MULTIPLIERS[rows][risk][0];

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: "linear-gradient(160deg, #0a0a0f 0%, #0d0d1a 100%)" }}
    >
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-black tracking-widest uppercase"
            style={{ color: "#f97316", textShadow: "0 0 30px #f9731666, 0 0 60px #f9731633" }}
          >
            Psyko Plinko
          </h1>
          <p className="text-gray-600 text-sm mt-1 tracking-widest uppercase">
            Drop &amp; Win up to {formatMult(maxMult)}
          </p>
        </div>

        {/* Cabinet */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #1a1a2e 0%, #0d0d18 100%)",
            border: "2px solid #f9731630",
            boxShadow: "0 0 60px #f9731615, inset 0 1px 0 #f9731620",
          }}
        >

          {/* Balance */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
            <span className="text-xs text-gray-600 uppercase tracking-widest font-bold">Balance</span>
            {balance !== null ? (
              <div className="text-right">
                <span className="text-yellow-400 font-black text-lg">{balance.toLocaleString()} ₱</span>
                <span className="text-gray-600 text-xs font-mono ml-2">≈ {toUSD(balance)}</span>
              </div>
            ) : (
              <span className="text-gray-600 text-sm">Sign in to play</span>
            )}
          </div>

          {/* Controls */}
          <div className="px-6 py-4 space-y-4 border-b border-white/5">

            {/* Rows */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-2">Rows</p>
              <div className="flex gap-2">
                {([8, 12, 16] as PlinkoRows[]).map(r => (
                  <button
                    key={r}
                    onClick={() => { if (!isDropping) setRows(r); }}
                    className="px-4 py-1.5 rounded-lg text-sm font-black transition-all"
                    style={{
                      background: rows === r ? "#f97316" : "#ffffff08",
                      color: rows === r ? "#fff" : "#6b7280",
                      border: rows === r ? "1px solid #f97316" : "1px solid #ffffff10",
                      boxShadow: rows === r ? "0 0 12px #f9731640" : "none",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-2">Risk</p>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as PlinkoRisk[]).map(r => {
                  const color = RISK_COLOR[r];
                  return (
                    <button
                      key={r}
                      onClick={() => { if (!isDropping) setRisk(r); }}
                      className="px-4 py-1.5 rounded-lg text-sm font-black capitalize transition-all"
                      style={{
                        background: risk === r ? color : "#ffffff08",
                        color: risk === r ? "#fff" : "#6b7280",
                        border: risk === r ? `1px solid ${color}` : "1px solid #ffffff10",
                        boxShadow: risk === r ? `0 0 12px ${color}50` : "none",
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bet */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-2">Bet Amount</p>
              <div className="flex gap-2 flex-wrap">
                {VALID_BETS.map(b => (
                  <button
                    key={b}
                    onClick={() => { if (!isDropping) setBet(b); }}
                    className="px-3 py-1.5 rounded-lg text-sm font-black transition-all"
                    style={{
                      background: bet === b ? "#f97316" : "#ffffff08",
                      color: bet === b ? "#fff" : "#6b7280",
                      border: bet === b ? "1px solid #f97316" : "1px solid #ffffff10",
                      boxShadow: bet === b ? "0 0 12px #f9731640" : "none",
                    }}
                  >
                    {b.toLocaleString()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-700 font-mono mt-1.5">≈ {toUSD(bet)} per drop</p>
            </div>
          </div>

          {/* Plinko Board */}
          <div className="px-3 py-4">
            {/* key={rows} remounts when rows changes to reset animation state */}
            <PlinkoBoard
              key={rows}
              rows={rows}
              risk={risk}
              result={result}
              animKey={animKey}
              onAnimationComplete={handleAnimationComplete}
            />
          </div>

          {/* Win/loss result */}
          {showResult && result && (
            <div
              className="mx-6 mb-4 rounded-xl px-4 py-3 text-center"
              style={{
                background: result.delta >= 0 ? "#4ade8010" : "#ef444410",
                border: `1px solid ${result.delta >= 0 ? "#4ade8030" : "#ef444430"}`,
              }}
            >
              {result.delta >= 0 ? (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">You won</p>
                  <p className="text-2xl font-black text-green-400">+{result.winnings.toLocaleString()} ₱</p>
                  <p className="text-xs text-gray-600 font-mono">
                    ≈ {toUSD(result.winnings)} · {result.multiplier}× multiplier
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">Lost</p>
                  <p className="text-lg font-black text-red-500">−{result.bet.toLocaleString()} ₱</p>
                  <p className="text-xs text-gray-600 font-mono">
                    ≈ {toUSD(result.bet)} · {result.multiplier}× multiplier
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="mx-6 mb-4 text-center text-red-400 text-sm font-bold">{error}</p>
          )}

          {/* Drop button */}
          <div className="px-6 pb-6">
            <button
              onClick={drop}
              disabled={!canDrop}
              className="w-full py-4 rounded-xl text-xl font-black uppercase tracking-widest transition-all"
              style={{
                background: canDrop
                  ? "linear-gradient(135deg, #f97316, #ea580c)"
                  : "#1f1f2e",
                color: canDrop ? "#fff" : "#374151",
                boxShadow: canDrop
                  ? "0 0 30px #f9731640, 0 4px 20px rgba(0,0,0,0.4)"
                  : "none",
                cursor: canDrop ? "pointer" : "not-allowed",
              }}
            >
              {balance === null
                ? "Sign in to play"
                : isDropping
                ? "Dropping…"
                : balance < bet
                ? "Insufficient Balance"
                : "DROP BALL"}
            </button>
          </div>
        </div>

        {/* Multiplier reference */}
        <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: "#0d0d18", border: "1px solid #ffffff08" }}>
          <div className="px-4 py-3 border-b border-white/5 text-center">
            <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">
              Bucket Multipliers — {rows} rows · <span style={{ color: RISK_COLOR[risk] }} className="capitalize">{risk} risk</span>
            </p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-1.5 justify-center">
            {MULTIPLIERS[rows][risk].map((mult, i) => {
              const color = bucketColor(mult);
              return (
                <div
                  key={i}
                  className="px-2 py-1 rounded text-xs font-black font-mono"
                  style={{
                    background: `${color}18`,
                    border: `1px solid ${color}50`,
                    color,
                  }}
                >
                  {formatMult(mult)}
                </div>
              );
            })}
          </div>
          <div className="px-4 pb-3 flex justify-center gap-4 flex-wrap">
            {[
              { label: "1000×+", color: "#ffd700" },
              { label: "10×+", color: "#f97316" },
              { label: "3×+", color: "#eab308" },
              { label: "1.5×+", color: "#22c55e" },
              { label: "0.5×+", color: "#f59e0b" },
              { label: "<0.5×", color: "#ef4444" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-xs text-gray-600 font-mono">{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
