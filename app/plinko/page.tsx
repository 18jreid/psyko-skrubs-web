"use client";

import { useState, useEffect, useRef } from "react";
import { toUSD } from "@/lib/caseItems";
import {
  MULTIPLIERS, VALID_BETS, bucketColor, formatMult,
  type PlinkoRows, type PlinkoRisk,
} from "@/lib/plinkoConfig";

// ── SVG board layout (pixel units = Matter.js units 1:1) ─────────────────────
const SVG_W      = 520;
const MARGIN_X   = 20;
const PEG_START_Y = 40;
const BUCKET_H   = 36;
const BUCKET_GAP = 2;
const CENTER_X   = SVG_W / 2;

function pegSpacing(rows: PlinkoRows)  { return (SVG_W - 2 * MARGIN_X) / rows; }
function rowHeight(rows: PlinkoRows)   { return rows === 8 ? 52 : rows === 12 ? 42 : 34; }
function pegRadius(rows: PlinkoRows)   { return rows === 8 ? 6 : rows === 12 ? 5 : 4.5; }
function ballRadius(rows: PlinkoRows)  { return rows === 8 ? 9 : rows === 12 ? 8 : 7; }
function bucketTopY(rows: PlinkoRows)  { return PEG_START_Y + rows * rowHeight(rows) + 12; }
function svgHeight(rows: PlinkoRows)   { return bucketTopY(rows) + BUCKET_H + 18; }

// ── Drop result types ─────────────────────────────────────────────────────────
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

// ── PlinkoBoard — uses Matter.js for real physics ─────────────────────────────
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
  const PS  = pegSpacing(rows);
  const RH  = rowHeight(rows);
  const PR  = pegRadius(rows);
  const BR  = ballRadius(rows);
  const BY  = bucketTopY(rows);
  const SH  = svgHeight(rows);
  const BW  = PS - BUCKET_GAP * 2;
  const mults     = MULTIPLIERS[rows][risk];
  const numBuckets = rows + 1;

  // Refs for direct SVG DOM updates — bypasses React re-renders at 60 fps
  const ballGroupRefs = useRef<(SVGGElement | null)[]>([]);
  const engineRef     = useRef<import("matter-js").Engine | null>(null);
  const runnerRef     = useRef<import("matter-js").Runner | null>(null);
  const rafRef        = useRef<number | null>(null);

  // React state only for slow-changing things
  const [ballCount,  setBallCount]  = useState(0);
  const [bucketHits, setBucketHits] = useState<Record<number, number>>({});

  useEffect(() => {
    if (animKey === 0 || !result) return;

    setBallCount(result.drops.length);
    setBucketHits({});

    // Wait one frame so SVG ball elements are in the DOM
    const setupFrame = requestAnimationFrame(async () => {
      // Dynamic import keeps Matter.js out of the SSR bundle
      const Matter = await import("matter-js");
      const { Engine, Bodies, Body, World, Runner, Events } = Matter;

      // ── Tear down previous simulation ──
      if (runnerRef.current) Runner.stop(runnerRef.current);
      if (engineRef.current) {
        World.clear(engineRef.current.world, false);
        Engine.clear(engineRef.current);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // ── Build engine ──
      // gravity.y = 0.3: ball reaches each peg with ~4–5 px/frame vy → ~3 s total
      const engine = Engine.create({ gravity: { x: 0, y: 0.3 } });
      engineRef.current = engine;

      // ── Static pegs ──
      for (let r = 0; r < rows; r++) {
        const n = r + 2;
        const y = PEG_START_Y + r * RH;
        for (let j = 0; j < n; j++) {
          const x = CENTER_X + (j - (n - 1) / 2) * PS;
          World.add(engine.world, Bodies.circle(x, y, PR, {
            isStatic: true,
            restitution: 0.25, // low bounce keeps balls moving downward
            friction: 0.02,
            label: "peg",
          }));
        }
      }

      // ── Walls ──
      const wallOpts = { isStatic: true, restitution: 0.1, friction: 0, label: "wall" };
      World.add(engine.world, [
        Bodies.rectangle(MARGIN_X - 6,         SH / 2, 12, SH * 2, wallOpts),
        Bodies.rectangle(SVG_W - MARGIN_X + 6, SH / 2, 12, SH * 2, wallOpts),
        Bodies.rectangle(CENTER_X, BY + BUCKET_H + 8, SVG_W, 16, {
          isStatic: true, label: "floor",
        }),
      ]);

      // ── Ball bodies ──
      const ballBodies = result.drops.map(() => {
        const startX = CENTER_X + (Math.random() - 0.5) * 3;
        const ball = Bodies.circle(startX, PEG_START_Y - 22, BR, {
          restitution: 0.25,
          friction: 0.02,
          frictionAir: 0.008,
          density: 0.002,
          label: "ball",
        });
        Body.setVelocity(ball, { x: (Math.random() - 0.5) * 0.3, y: 0.5 });
        return ball;
      });
      World.add(engine.world, ballBodies);

      // ── Per-ball state ──
      // rights tracks how many R turns have been applied (= bucketIdx when done)
      const ballStates = result.drops.map(() => ({
        lastRow: -1,
        rights: 0,
        landed: false,
      }));
      let allLanded = false;
      let completionTimer: ReturnType<typeof setTimeout> | null = null;

      Events.on(engine, "afterUpdate", () => {
        for (let i = 0; i < ballBodies.length; i++) {
          const ball  = ballBodies[i];
          const state = ballStates[i];
          if (state.landed) continue;

          if (ball.velocity.y > 0) {
            for (let r = state.lastRow + 1; r < rows; r++) {
              const pegY = PEG_START_Y + r * RH;
              if (ball.position.y >= pegY - RH * 0.18) {
                state.lastRow = r;
                const dir  = result.drops[i].path[r];
                const sign = dir === "R" ? 1 : -1;

                // ① Snap x to the correct gap so accumulated drift can't
                //    cause the ball to pass through the wrong channel
                const correctX = CENTER_X + (state.rights - r / 2) * PS;
                Body.setPosition(ball, {
                  x: correctX + (Math.random() - 0.5) * PS * 0.12,
                  y: ball.position.y,
                });

                // ② Set vx in correct direction + ensure minimum vy so
                //    energy losses from bounces don't stall the ball
                Body.setVelocity(ball, {
                  x: sign * (0.9 + Math.random() * 0.5),
                  y: Math.max(ball.velocity.y, 1.2),
                });

                if (dir === "R") state.rights++;
                break;
              }
            }
          }

          if (ball.position.y >= BY + BUCKET_H * 0.5 && !state.landed) {
            state.landed = true;
          }
        }

        if (!allLanded && ballStates.every(s => s.landed)) {
          allLanded = true;
          completionTimer = setTimeout(() => {
            // Highlight the server-determined winning buckets
            const hits: Record<number, number> = {};
            for (const d of result.drops) hits[d.bucketIdx] = (hits[d.bucketIdx] ?? 0) + 1;
            setBucketHits(hits);

            if (runnerRef.current) Runner.stop(runnerRef.current);
            if (rafRef.current)    cancelAnimationFrame(rafRef.current);

            setTimeout(onAnimationComplete, 450);
          }, 500); // brief settle time before showing result
        }
      });

      // ── RAF render loop — updates SVG transforms directly, no React state ──
      const renderLoop = () => {
        for (let i = 0; i < ballBodies.length; i++) {
          const { x, y } = ballBodies[i].position;
          const el = ballGroupRefs.current[i];
          if (el) el.setAttribute("transform", `translate(${x},${y})`);
        }
        rafRef.current = requestAnimationFrame(renderLoop);
      };
      rafRef.current = requestAnimationFrame(renderLoop);

      // ── Start the physics runner ──
      const runner = Runner.create({ delta: 1000 / 60 });
      runnerRef.current = runner;
      Runner.run(runner, engine);
    });

    return () => {
      cancelAnimationFrame(setupFrame);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Async cleanup to avoid import on every cleanup call
      import("matter-js").then(({ Runner, World, Engine }) => {
        if (runnerRef.current) { Runner.stop(runnerRef.current); runnerRef.current = null; }
        if (engineRef.current) {
          World.clear(engineRef.current.world, false);
          Engine.clear(engineRef.current);
          engineRef.current = null;
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  // ── Static peg positions for SVG rendering ────────────────────────────────
  const svgPegs: { x: number; y: number; k: string }[] = [];
  for (let r = 0; r < rows; r++) {
    const n = r + 2;
    const y = PEG_START_Y + r * RH;
    for (let j = 0; j < n; j++) {
      svgPegs.push({ x: CENTER_X + (j - (n - 1) / 2) * PS, y, k: `${r}-${j}` });
    }
  }

  // ── Bucket layout ─────────────────────────────────────────────────────────
  const buckets = Array.from({ length: numBuckets }, (_, b) => {
    const cx   = CENTER_X + (b - (numBuckets - 1) / 2) * PS;
    const mult  = mults[b];
    const color = bucketColor(mult);
    const hits  = bucketHits[b] ?? 0;
    return { cx, x: cx - BW / 2, width: BW, mult, color, hits };
  });

  const fs = PS < 32 ? 8 : PS < 45 ? 9 : 10;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SH}`} width="100%" style={{ display: "block" }}>
      <rect width={SVG_W} height={SH} fill="#05050c" rx={10} />

      {/* Pegs */}
      {svgPegs.map(({ x, y, k }) => (
        <circle key={k} cx={x} cy={y} r={PR}
          fill="#e2e8f033" stroke="#e2e8f018" strokeWidth={1} />
      ))}

      {/* Buckets */}
      {buckets.map(({ cx, x, width, mult, color, hits }, b) => {
        const active = hits > 0;
        return (
          <g key={b}>
            <rect
              x={x} y={BY} width={width} height={BUCKET_H} rx={3}
              fill={active ? color : `${color}22`}
              stroke={active ? color : `${color}77`}
              strokeWidth={active ? 2 : 1}
              style={{ transition: "fill 0.3s, stroke-width 0.3s" }}
            />
            {active && (
              <rect
                x={x - 1} y={BY - 1} width={width + 2} height={BUCKET_H + 2} rx={4}
                fill="none" stroke={color} strokeWidth={2} opacity={0.5}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
            )}
            <text
              x={cx} y={BY + BUCKET_H / 2 + 4}
              textAnchor="middle"
              fill={active ? (mult >= 1.5 ? "#000" : "#fff") : color}
              fontSize={fs} fontWeight="bold" fontFamily="monospace"
              style={{ transition: "fill 0.3s" }}
            >
              {formatMult(mult)}
            </text>
            {hits > 1 && (
              <g>
                <circle cx={x + width - 1} cy={BY + 1} r={7} fill="#f97316" />
                <text x={x + width - 1} y={BY + 5}
                  textAnchor="middle" fill="#fff" fontSize={8} fontWeight="bold">
                  {hits}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Ball elements — positions written directly via DOM refs, not React state */}
      {Array.from({ length: ballCount }, (_, i) => (
        <g
          key={i}
          ref={el => { ballGroupRefs.current[i] = el; }}
          transform={`translate(${CENTER_X},${PEG_START_Y - 22})`}
        >
          <circle
            cx={0} cy={0} r={BR}
            fill="#f97316" stroke="#fed7aa" strokeWidth={1.5}
            style={{ filter: "drop-shadow(0 0 8px #f97316aa)" }}
          />
        </g>
      ))}
    </svg>
  );
}

// ── UI constants ──────────────────────────────────────────────────────────────
const RISK_COLOR: Record<PlinkoRisk, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};
const VALID_COUNTS = [1, 3, 5, 10] as const;
type ValidCount = (typeof VALID_COUNTS)[number];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlinkoPage() {
  const [balance,  setBalance]  = useState<number | null>(null);
  const [rows,     setRows]     = useState<PlinkoRows>(16);
  const [risk,     setRisk]     = useState<PlinkoRisk>("medium");
  const [bet,      setBet]      = useState(50);
  const [numBalls, setNumBalls] = useState<ValidCount>(1);
  const [isDropping, setIsDropping] = useState(false);
  const [animKey,  setAnimKey]  = useState(0);
  const [result,   setResult]   = useState<DropResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

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

    setBalance(prev => prev === null ? null : prev - totalBet);
    setResult(data);
    setAnimKey(k => k + 1);
  };

  const handleAnimationComplete = () => {
    if (result) setBalance(result.balance);
    setShowResult(true);
    setIsDropping(false);
  };

  const canDrop  = !isDropping && balance !== null && balance >= totalBet;
  const maxMult  = MULTIPLIERS[rows][risk][0];

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
                  <button key={r} onClick={() => { if (!isDropping) setRows(r); }}
                    className="px-4 py-1.5 rounded-lg text-sm font-black transition-all"
                    style={{
                      background: rows === r ? "#f97316" : "#ffffff08",
                      color: rows === r ? "#fff" : "#6b7280",
                      border: rows === r ? "1px solid #f97316" : "1px solid #ffffff10",
                      boxShadow: rows === r ? "0 0 12px #f9731640" : "none",
                    }}>
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
                    <button key={r} onClick={() => { if (!isDropping) setRisk(r); }}
                      className="px-4 py-1.5 rounded-lg text-sm font-black capitalize transition-all"
                      style={{
                        background: risk === r ? color : "#ffffff08",
                        color: risk === r ? "#fff" : "#6b7280",
                        border: risk === r ? `1px solid ${color}` : "1px solid #ffffff10",
                        boxShadow: risk === r ? `0 0 12px ${color}50` : "none",
                      }}>
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
                  <button key={n} onClick={() => { if (!isDropping) setNumBalls(n); }}
                    className="px-4 py-1.5 rounded-lg text-sm font-black transition-all"
                    style={{
                      background: numBalls === n ? "#a855f7" : "#ffffff08",
                      color: numBalls === n ? "#fff" : "#6b7280",
                      border: numBalls === n ? "1px solid #a855f7" : "1px solid #ffffff10",
                      boxShadow: numBalls === n ? "0 0 12px #a855f750" : "none",
                    }}>
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
                  <button key={b} onClick={() => { if (!isDropping) setBet(b); }}
                    className="px-3 py-1.5 rounded-lg text-sm font-black transition-all"
                    style={{
                      background: bet === b ? "#f97316" : "#ffffff08",
                      color: bet === b ? "#fff" : "#6b7280",
                      border: bet === b ? "1px solid #f97316" : "1px solid #ffffff10",
                      boxShadow: bet === b ? "0 0 12px #f9731640" : "none",
                    }}>
                    {b.toLocaleString()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-700 font-mono mt-1.5">
                Total:{" "}
                <span className="text-gray-500 font-black">{totalBet.toLocaleString()} ₱</span>
                {numBalls > 1 && (
                  <span className="text-gray-700 ml-1">({numBalls} × {bet.toLocaleString()} ₱)</span>
                )}
                <span className="ml-1">≈ {toUSD(totalBet)}</span>
              </p>
            </div>
          </div>

          {/* Board — remount on row change resets engine */}
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
                  <p className="text-2xl font-black text-green-400">+{result.totalWinnings.toLocaleString()} ₱</p>
                  <p className="text-xs text-gray-600 font-mono">≈ {toUSD(result.totalWinnings)}
                    {numBalls > 1 && <span className="ml-2 text-gray-700">across {numBalls} balls · avg {(result.totalWinnings / numBalls).toFixed(0)} ₱</span>}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">Lost</p>
                  <p className="text-lg font-black text-red-500">−{result.totalBet.toLocaleString()} ₱</p>
                  <p className="text-xs text-gray-600 font-mono">≈ {toUSD(result.totalBet)}</p>
                </>
              )}
              {numBalls > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                  {result.drops.map((d, i) => {
                    const color = bucketColor(d.multiplier);
                    return (
                      <div key={i} className="px-2 py-0.5 rounded text-xs font-black font-mono"
                        style={{ background: `${color}18`, border: `1px solid ${color}50`, color }}>
                        {formatMult(d.multiplier)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && <p className="mx-6 mb-4 text-center text-red-400 text-sm font-bold">{error}</p>}

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
                : numBalls === 1 ? "DROP BALL" : `DROP ${numBalls} BALLS`}
            </button>
          </div>
        </div>

        {/* Multiplier reference */}
        <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: "#0d0d18", border: "1px solid #ffffff08" }}>
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
                <div key={i} className="px-2 py-1 rounded text-xs font-black font-mono"
                  style={{ background: `${color}18`, border: `1px solid ${color}50`, color }}>
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
