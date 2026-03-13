"use client";

import { useState, useEffect, useRef } from "react";
import { toUSD } from "@/lib/caseItems";
import {
  MULTIPLIERS, VALID_BETS, bucketColor, formatMult,
  type PlinkoRows, type PlinkoRisk,
} from "@/lib/plinkoConfig";

// ── Board layout ─────────────────────────────────────────────────────────────
const SVG_W = 520;
const MARGIN_X = 20;
const PEG_START_Y = 40;
const BUCKET_H = 32;
const BUCKET_GAP = 2;
const CENTER_X = SVG_W / 2;

function pegSpacing(rows: PlinkoRows)  { return (SVG_W - 2 * MARGIN_X) / rows; }
function rowHeight(rows: PlinkoRows)   { return rows === 8 ? 52 : rows === 12 ? 42 : 34; }
function pegRadius(rows: PlinkoRows)   { return rows === 8 ? 5 : rows === 12 ? 4.5 : 4; }
function ballRadius(rows: PlinkoRows)  { return rows === 8 ? 8 : rows === 12 ? 7 : 6; }
function bucketTopY(rows: PlinkoRows)  { return PEG_START_Y + rows * rowHeight(rows) + 10; }
function svgHeight(rows: PlinkoRows)   { return bucketTopY(rows) + BUCKET_H + 16; }

function ballX(rights: number, r: number, rows: PlinkoRows) {
  return CENTER_X + (rights - r / 2) * pegSpacing(rows);
}

/**
 * Produces 3*rows+2 waypoints per ball:
 *   1 entry point above board
 *   per row: approach → peg deflect → depart toward next row
 *   1 final bucket landing
 *
 * `startJitter` (±px) gives each ball a unique horizontal starting offset
 * that fades toward zero as the ball falls — makes paths visually distinct
 * even when two balls share the same L/R choices.
 */
function computeWaypoints(
  path: ("L" | "R")[],
  rows: PlinkoRows,
  startJitter: number,
): { x: number; y: number }[] {
  const PS = pegSpacing(rows);
  const RH = rowHeight(rows);
  const BY = bucketTopY(rows);
  const pts: { x: number; y: number }[] = [];

  let rights = 0;
  pts.push({ x: CENTER_X + startJitter, y: PEG_START_Y - 25 });

  for (let r = 0; r < rows; r++) {
    const base   = ballX(rights, r, rows);
    // Jitter fades: full spread at top, gone by bottom
    const fade   = startJitter * Math.max(0, 1 - r / rows) * 0.55;
    // Small random noise at each peg — purely cosmetic, doesn't change outcome
    const noise  = (Math.random() - 0.5) * 3.5;
    const dir    = path[r];
    const deflect = dir === "R" ? PS * 0.14 : -PS * 0.14;

    // 1. Approach peg from above
    pts.push({ x: base + fade,                         y: PEG_START_Y + r * RH - RH * 0.28 });
    // 2. Hit peg — deflect in bounce direction
    pts.push({ x: base + deflect + noise,              y: PEG_START_Y + r * RH });

    if (dir === "R") rights++;

    // 3. Depart toward next gap
    const nextBase = ballX(rights, r + 1, rows);
    pts.push({ x: nextBase + fade * 0.45 + noise * 0.4, y: PEG_START_Y + r * RH + RH * 0.5 });
  }

  // Land precisely in bucket — no jitter at the end
  pts.push({ x: CENTER_X + (rights - rows / 2) * PS, y: BY + BUCKET_H / 2 });
  return pts;
}

/**
 * Per-step delay array: slow at the top (gravity = 0), fast at the bottom.
 * Targets: 8-row ≈ 2.0 s, 12-row ≈ 2.7 s, 16-row ≈ 3.5 s total.
 *
 * Formula: delay[i] = dMax - (dMax - dMin) * (i/n)²  (quadratic ease-in)
 * Integral ≈ n * (dMax - (dMax-dMin)/3) = n * (2dMax/3 + dMin/3) = target
 * With dMin = dMax * 0.25:  n * dMax * 0.75 = target  →  dMax = target / (n * 0.75)
 */
function computeDelays(rows: PlinkoRows): number[] {
  const n      = 3 * rows + 2; // waypoint count
  const target = rows === 8 ? 2000 : rows === 12 ? 2700 : 3500;
  const dMax   = target / (n * 0.75);
  const dMin   = dMax * 0.25;
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(n - 1, 1);
    return dMax - (dMax - dMin) * t * t;
  });
}

// Fixed CSS transition — slightly under the fastest step so motion stays crisp
const BALL_TRANSITION_MS = 58;

// ── Types ────────────────────────────────────────────────────────────────────
interface SingleDrop {
  path: ("L" | "R")[];
  bucketIdx: number;
  multiplier: number;
  winnings: number;
}

interface DropResult {
  drops: SingleDrop[];
  bet: number;
  totalBet: number;
  totalWinnings: number;
  totalDelta: number;
  balance: number;
}

// ── PlinkoBoard ───────────────────────────────────────────────────────────────
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
  const BY = bucketTopY(rows);
  const SH = svgHeight(rows);
  const bucketW = PS - BUCKET_GAP * 2;

  type BallState = { x: number; y: number; visible: boolean };
  const [balls, setBalls] = useState<BallState[]>([]);
  const [bucketHits, setBucketHits] = useState<Record<number, number>>({});
  const cancelRef = useRef(false);

  useEffect(() => {
    if (animKey === 0 || !result) return;
    cancelRef.current = false;

    // Each ball gets a unique random starting jitter (±7 px)
    const waypointsList = result.drops.map(d =>
      computeWaypoints(d.path, rows, (Math.random() - 0.5) * 14)
    );
    const delays   = computeDelays(rows);
    const maxSteps = waypointsList[0].length; // 3*rows+2

    setBalls(waypointsList.map(wp => ({ x: wp[0].x, y: wp[0].y, visible: true })));
    setBucketHits({});

    let step = 1;
    const tick = () => {
      if (cancelRef.current) return;
      if (step < maxSteps) {
        setBalls(waypointsList.map(wp => ({ x: wp[step].x, y: wp[step].y, visible: true })));
        const delay = delays[Math.min(step, delays.length - 1)];
        step++;
        setTimeout(tick, delay);
      } else {
        const hits: Record<number, number> = {};
        for (const d of result.drops) hits[d.bucketIdx] = (hits[d.bucketIdx] ?? 0) + 1;
        setBucketHits(hits);
        setTimeout(onAnimationComplete, 400);
      }
    };

    setTimeout(tick, delays[0]);
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  // ── Peg grid: row r → r+2 pegs ──
  const pegs: { x: number; y: number; k: string }[] = [];
  for (let r = 0; r < rows; r++) {
    const n = r + 2;
    const y = PEG_START_Y + r * RH;
    for (let j = 0; j < n; j++) {
      pegs.push({ x: CENTER_X + (j - (n - 1) / 2) * PS, y, k: `${r}-${j}` });
    }
  }

  // ── Bucket layout ──
  const buckets = Array.from({ length: numBuckets }, (_, b) => {
    const cx = CENTER_X + (b - (numBuckets - 1) / 2) * PS;
    const mult = mults[b];
    const color = bucketColor(mult);
    const hits = bucketHits[b] ?? 0;
    return { cx, x: cx - bucketW / 2, width: bucketW, mult, color, hits };
  });

  const fs  = PS < 32 ? 8 : PS < 45 ? 9 : 10;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SH}`} width="100%" style={{ display: "block" }}>
      <rect width={SVG_W} height={SH} fill="#05050c" rx={10} />

      {/* Pegs */}
      {pegs.map(({ x, y, k }) => (
        <circle key={k} cx={x} cy={y} r={PR} fill="#e2e8f030" stroke="#e2e8f018" strokeWidth={1} />
      ))}

      {/* Buckets */}
      {buckets.map(({ cx, x, width, mult, color, hits }, b) => {
        const isActive = hits > 0;
        return (
          <g key={b}>
            <rect
              x={x} y={BY} width={width} height={BUCKET_H} rx={3}
              fill={isActive ? color : `${color}22`}
              stroke={isActive ? color : `${color}77`}
              strokeWidth={isActive ? 2 : 1}
              style={{ transition: "fill 0.3s, stroke-width 0.3s" }}
            />
            {/* Glow outline on active bucket */}
            {isActive && (
              <rect
                x={x - 1} y={BY - 1} width={width + 2} height={BUCKET_H + 2} rx={4}
                fill="none" stroke={color} strokeWidth={2} opacity={0.45}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
            )}
            {/* Multiplier label */}
            <text
              x={cx} y={BY + BUCKET_H / 2 + 4}
              textAnchor="middle"
              fill={isActive ? (mult >= 1.5 ? "#000" : "#fff") : color}
              fontSize={fs} fontWeight="bold" fontFamily="monospace"
              style={{ transition: "fill 0.3s" }}
            >
              {formatMult(mult)}
            </text>
            {/* Ball-count badge when multiple balls land in same bucket */}
            {hits > 1 && (
              <g>
                <circle cx={x + width - 1} cy={BY + 1} r={7} fill="#f97316" />
                <text
                  x={x + width - 1} y={BY + 5}
                  textAnchor="middle" fill="#fff" fontSize={8} fontWeight="bold"
                >
                  {hits}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Animated balls — all advance together each step */}
      {balls.map((b, i) =>
        b.visible ? (
          <g
            key={i}
            style={{
              transform: `translate(${b.x}px, ${b.y}px)`,
              transition: `transform ${BALL_TRANSITION_MS}ms ease-in-out`,
            }}
          >
            <circle
              cx={0} cy={0} r={BR}
              fill="#f97316" stroke="#fed7aa" strokeWidth={1.5}
              style={{ filter: "drop-shadow(0 0 7px #f97316aa)" }}
            />
          </g>
        ) : null
      )}
    </svg>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const RISK_COLOR: Record<PlinkoRisk, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};
const VALID_COUNTS = [1, 3, 5, 10] as const;
type ValidCount = (typeof VALID_COUNTS)[number];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlinkoPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [rows, setRows]       = useState<PlinkoRows>(16);
  const [risk, setRisk]       = useState<PlinkoRisk>("medium");
  const [bet, setBet]         = useState(50);
  const [numBalls, setNumBalls] = useState<ValidCount>(1);
  const [isDropping, setIsDropping] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [result, setResult]   = useState<DropResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cases/balance")
      .then(r => r.json())
      .then(d => { if (d.balance !== null) setBalance(d.balance); });
  }, []);

  const totalBet = bet * numBalls;

  const drop = async () => {
    if (isDropping) return;
    setError(null);
    setShowResult(false);
    setIsDropping(true);

    const res = await fetch("/api/plinko/drop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet, rows, risk, count: numBalls }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error");
      setIsDropping(false);
      return;
    }

    // Deduct total bet optimistically while balls animate
    setBalance(prev => prev === null ? null : prev - totalBet);
    setResult(data);
    setAnimKey(k => k + 1);
  };

  const handleAnimationComplete = () => {
    if (result) setBalance(result.balance);
    setShowResult(true);
    setIsDropping(false);
  };

  const canDrop = !isDropping && balance !== null && balance >= totalBet;
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

            {/* Balls */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-2">Balls</p>
              <div className="flex gap-2">
                {VALID_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => { if (!isDropping) setNumBalls(n); }}
                    className="px-4 py-1.5 rounded-lg text-sm font-black transition-all"
                    style={{
                      background: numBalls === n ? "#a855f7" : "#ffffff08",
                      color: numBalls === n ? "#fff" : "#6b7280",
                      border: numBalls === n ? "1px solid #a855f7" : "1px solid #ffffff10",
                      boxShadow: numBalls === n ? "0 0 12px #a855f750" : "none",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-2">Bet Per Ball</p>
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
              <p className="text-xs text-gray-700 font-mono mt-1.5">
                Total:{" "}
                <span className="text-gray-500 font-black">
                  {totalBet.toLocaleString()} ₱
                </span>
                {numBalls > 1 && (
                  <span className="text-gray-700 ml-1">
                    ({numBalls} × {bet.toLocaleString()} ₱)
                  </span>
                )}
                <span className="ml-1">≈ {toUSD(totalBet)}</span>
              </p>
            </div>
          </div>

          {/* Board — remount when rows change to reset peg layout */}
          <div className="px-3 py-4">
            <PlinkoBoard
              key={rows}
              rows={rows}
              risk={risk}
              result={result}
              animKey={animKey}
              onAnimationComplete={handleAnimationComplete}
            />
          </div>

          {/* Result */}
          {showResult && result && (
            <div
              className="mx-6 mb-4 rounded-xl px-4 py-3 text-center"
              style={{
                background: result.totalDelta >= 0 ? "#4ade8010" : "#ef444410",
                border: `1px solid ${result.totalDelta >= 0 ? "#4ade8030" : "#ef444430"}`,
              }}
            >
              {result.totalDelta >= 0 ? (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">You won</p>
                  <p className="text-2xl font-black text-green-400">
                    +{result.totalWinnings.toLocaleString()} ₱
                  </p>
                  <p className="text-xs text-gray-600 font-mono">
                    ≈ {toUSD(result.totalWinnings)}
                    {numBalls > 1 && (
                      <span className="ml-2 text-gray-700">
                        across {numBalls} balls · avg {(result.totalWinnings / numBalls).toFixed(0)} ₱
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">Lost</p>
                  <p className="text-lg font-black text-red-500">
                    −{result.totalBet.toLocaleString()} ₱
                  </p>
                  <p className="text-xs text-gray-600 font-mono">≈ {toUSD(result.totalBet)}</p>
                </>
              )}
              {/* Per-ball breakdown for multi-ball */}
              {numBalls > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                  {result.drops.map((d, i) => {
                    const color = bucketColor(d.multiplier);
                    return (
                      <div
                        key={i}
                        className="px-2 py-0.5 rounded text-xs font-black font-mono"
                        style={{ background: `${color}18`, border: `1px solid ${color}50`, color }}
                      >
                        {formatMult(d.multiplier)}
                      </div>
                    );
                  })}
                </div>
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
                background: canDrop ? "linear-gradient(135deg, #f97316, #ea580c)" : "#1f1f2e",
                color: canDrop ? "#fff" : "#374151",
                boxShadow: canDrop ? "0 0 30px #f9731640, 0 4px 20px rgba(0,0,0,0.4)" : "none",
                cursor: canDrop ? "pointer" : "not-allowed",
              }}
            >
              {balance === null
                ? "Sign in to play"
                : isDropping
                ? "Dropping…"
                : balance < totalBet
                ? "Insufficient Balance"
                : numBalls === 1
                ? "DROP BALL"
                : `DROP ${numBalls} BALLS`}
            </button>
          </div>
        </div>

        {/* Multiplier reference table */}
        <div
          className="mt-4 rounded-2xl overflow-hidden"
          style={{ background: "#0d0d18", border: "1px solid #ffffff08" }}
        >
          <div className="px-4 py-3 border-b border-white/5 text-center">
            <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">
              Bucket Multipliers — {rows} rows ·{" "}
              <span style={{ color: RISK_COLOR[risk] }} className="capitalize">{risk} risk</span>
            </p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-1.5 justify-center">
            {MULTIPLIERS[rows][risk].map((mult, i) => {
              const color = bucketColor(mult);
              return (
                <div
                  key={i}
                  className="px-2 py-1 rounded text-xs font-black font-mono"
                  style={{ background: `${color}18`, border: `1px solid ${color}50`, color }}
                >
                  {formatMult(mult)}
                </div>
              );
            })}
          </div>
          <div className="px-4 pb-3 flex justify-center gap-4 flex-wrap">
            {[
              { label: "1000×+", color: "#ffd700" },
              { label: "10×+",   color: "#f97316" },
              { label: "3×+",    color: "#eab308" },
              { label: "1.5×+",  color: "#22c55e" },
              { label: "0.5×+",  color: "#f59e0b" },
              { label: "<0.5×",  color: "#ef4444" },
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
