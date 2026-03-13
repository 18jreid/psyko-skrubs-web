"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { toUSD } from "@/lib/caseItems";
import {
  MULTIPLIERS,
  VALID_BETS,
  bucketColor,
  formatMult,
  type PlinkoRows,
  type PlinkoRisk,
} from "@/lib/plinkoConfig";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Layout constants (logical px = Matter.js units) ───────────────────────────
const BOARD_W    = 560;
const BOARD_PAD  = 24;
const PEG_START_Y = 50;
const BUCKET_H   = 40;
const CENTER_X   = 280;

function pegSpacing(rows: PlinkoRows): number {
  return (BOARD_W - 2 * BOARD_PAD) / rows;
}
function rowHeight(rows: PlinkoRows): number {
  return rows === 8 ? 58 : rows === 12 ? 48 : 40;
}
function pegRadius(rows: PlinkoRows): number {
  return rows === 8 ? 6.5 : rows === 12 ? 5.5 : 5;
}
function ballRadius(rows: PlinkoRows): number {
  return rows === 8 ? 11 : rows === 12 ? 9.5 : 8.5;
}
function bucketTopY(rows: PlinkoRows): number {
  return PEG_START_Y + rows * rowHeight(rows) + 14;
}
function boardH(rows: PlinkoRows): number {
  return bucketTopY(rows) + BUCKET_H + 22;
}
function bucketCX(b: number, rows: PlinkoRows): number {
  return CENTER_X + (b - rows / 2) * pegSpacing(rows);
}
function ballXAtRow(rights: number, r: number, rows: PlinkoRows): number {
  return CENTER_X + (rights - r / 2) * pegSpacing(rows);
}

// ── Rounded rect helper (no ctx.roundRect for compat) ────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── drawFrame — pure function, runs outside component ────────────────────────
interface DrawCfg {
  rows: PlinkoRows;
  risk: PlinkoRisk;
  BH: number;
  PS: number;
  RH: number;
  PR: number;
  BR: number;
  BY: number;
  mults: number[];
  numBuckets: number;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  cfg: DrawCfg,
  ballBodies: { position: { x: number; y: number } }[],
  trails: { x: number; y: number }[][],
  activeBuckets: Record<number, number>
) {
  const { rows, BH, PS, RH, PR, BR, BY, mults, numBuckets } = cfg;

  // 1. Background
  ctx.fillStyle = "#05050c";
  ctx.fillRect(0, 0, BOARD_W, BH);

  // 2. Pegs
  for (let r = 0; r < rows; r++) {
    const n = r + 2;
    const y = PEG_START_Y + r * RH;
    for (let j = 0; j < n; j++) {
      const x = CENTER_X + (j - (n - 1) / 2) * PS;

      // Soft halo glow
      const haloR = PR * 3.5;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      halo.addColorStop(0, "rgba(200,220,255,0.10)");
      halo.addColorStop(1, "rgba(200,220,255,0)");
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // Peg body with radial gradient
      const hlx = x - PR * 0.3;
      const hly = y - PR * 0.3;
      const pegGrad = ctx.createRadialGradient(hlx, hly, 0, x, y, PR);
      pegGrad.addColorStop(0, "#f1f5f9");
      pegGrad.addColorStop(1, "#94a3b8");
      ctx.beginPath();
      ctx.arc(x, y, PR, 0, Math.PI * 2);
      ctx.fillStyle = pegGrad;
      ctx.fill();

      // Specular dot
      ctx.beginPath();
      ctx.arc(x - PR * 0.28, y - PR * 0.28, PR * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    }
  }

  // 3. Buckets
  for (let b = 0; b < numBuckets; b++) {
    const cx   = bucketCX(b, rows);
    const bw   = PS - 3;
    const bx   = cx - bw / 2;
    const mult  = mults[b];
    const color = bucketColor(mult);
    const glow  = activeBuckets[b] ?? 0;

    // Fill
    ctx.beginPath();
    roundRect(ctx, bx, BY, bw, BUCKET_H, 3);
    ctx.fillStyle = glow > 0
      ? color + Math.round(0xdd * glow).toString(16).padStart(2, "0")
      : color + "28";
    ctx.fill();

    // Stroke
    ctx.beginPath();
    roundRect(ctx, bx, BY, bw, BUCKET_H, 3);
    const strokeAlpha = glow > 0 ? Math.round(0xff * Math.min(1, 0.5 + glow * 0.5)) : 0x55;
    ctx.strokeStyle = color + strokeAlpha.toString(16).padStart(2, "0");
    ctx.lineWidth = 1;
    ctx.stroke();

    // Active glow — 3 layered strokes, no shadowBlur
    if (glow > 0) {
      const glowLayers = [
        { lw: 10, alpha: 0.07 * glow },
        { lw: 6,  alpha: 0.14 * glow },
        { lw: 2,  alpha: 0.55 * glow },
      ];
      for (const { lw, alpha } of glowLayers) {
        ctx.beginPath();
        roundRect(ctx, bx, BY, bw, BUCKET_H, 3);
        const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.strokeStyle = color + a;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }

    // Multiplier text
    const fontSize = bw < 32 ? 8 : bw < 45 ? 9 : 10;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const isActive = glow > 0;
    ctx.fillStyle = isActive ? (mult >= 1.5 ? "#000" : "#fff") : color;
    ctx.fillText(formatMult(mult), cx, BY + BUCKET_H / 2);
  }

  // 4. Ball trails
  for (let i = 0; i < trails.length; i++) {
    const trail = trails[i];
    const len = trail.length;
    for (let t = 0; t < len; t++) {
      const { x, y } = trail[t];
      const frac = t / len;
      const r2 = BR * frac * 0.6;
      if (r2 < 0.5) continue;
      ctx.beginPath();
      ctx.arc(x, y, r2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(249,115,22,${frac * 0.3})`;
      ctx.fill();
    }
  }

  // 5. Balls
  for (const ball of ballBodies) {
    const { x, y } = ball.position;

    // Outer glow
    const outerR = BR * 2.5;
    const outerGrad = ctx.createRadialGradient(x, y, 0, x, y, outerR);
    outerGrad.addColorStop(0, "rgba(249,115,22,0.4)");
    outerGrad.addColorStop(1, "rgba(249,115,22,0)");
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // Ball body
    const hlx = x - BR * 0.3;
    const hly = y - BR * 0.3;
    const ballGrad = ctx.createRadialGradient(hlx, hly, 0, x, y, BR);
    ballGrad.addColorStop(0,   "#fff7ed");
    ballGrad.addColorStop(0.5, "#fb923c");
    ballGrad.addColorStop(1,   "#9a3412");
    ctx.beginPath();
    ctx.arc(x, y, BR, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(x - BR * 0.28, y - BR * 0.32, BR * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();
  }
}

// ── PlinkoBoard component ─────────────────────────────────────────────────────
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
  const BH  = boardH(rows);
  const mults      = MULTIPLIERS[rows][risk];
  const numBuckets = rows + 1;

  const cfg: DrawCfg = { rows, risk, BH, PS, RH, PR, BR, BY, mults, numBuckets };

  const canvasRef      = useRef<HTMLCanvasElement | null>(null);
  const engineRef      = useRef<import("matter-js").Engine | null>(null);
  const runnerRef      = useRef<import("matter-js").Runner | null>(null);
  const rafRef         = useRef<number | null>(null);
  const trailsRef      = useRef<{ x: number; y: number }[][]>([]);
  const activeBucketsRef = useRef<Record<number, number>>({});

  // ── Static board draw on rows/risk change ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = BOARD_W * dpr;
    canvas.height = BH * dpr;
    canvas.style.width  = BOARD_W + "px";
    canvas.style.height = BH + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawFrame(ctx, cfg, [], [], {});
  }, [rows, risk]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Physics animation on animKey change ────────────────────────────────────
  useEffect(() => {
    if (animKey === 0 || !result) return;

    // Reset trails & buckets
    trailsRef.current = result.drops.map(() => []);
    activeBucketsRef.current = {};

    const setupFrame = requestAnimationFrame(async () => {
      const Matter = await import("matter-js");
      const { Engine, Bodies, Body, World, Runner, Events } = Matter;

      // Tear down previous simulation
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (runnerRef.current) Runner.stop(runnerRef.current);
      if (engineRef.current) {
        World.clear(engineRef.current.world, false);
        Engine.clear(engineRef.current);
      }

      // Canvas setup (retina-aware)
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = BOARD_W * dpr;
      canvas.height = BH * dpr;
      canvas.style.width  = BOARD_W + "px";
      canvas.style.height = BH + "px";
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // Build engine
      const engine = Engine.create({ gravity: { x: 0, y: 0.4 } });
      engineRef.current = engine;

      // Static pegs
      for (let r = 0; r < rows; r++) {
        const n = r + 2;
        const y = PEG_START_Y + r * RH;
        for (let j = 0; j < n; j++) {
          const x = CENTER_X + (j - (n - 1) / 2) * PS;
          World.add(engine.world, Bodies.circle(x, y, PR, {
            isStatic: true,
            restitution: 0.3,
            friction: 0.02,
            label: "peg",
          }));
        }
      }

      // Walls
      const wallOpts = { isStatic: true, restitution: 0.1, friction: 0, label: "wall" };
      World.add(engine.world, [
        Bodies.rectangle(BOARD_PAD - 8,           BH / 2, 16, BH * 2, wallOpts),
        Bodies.rectangle(BOARD_W - BOARD_PAD + 8, BH / 2, 16, BH * 2, wallOpts),
        Bodies.rectangle(CENTER_X, BY + BUCKET_H + 10, BOARD_W, 16, {
          isStatic: true, label: "floor",
        }),
      ]);

      // Ball bodies
      const ballBodies = result.drops.map(() => {
        const startX = CENTER_X + (Math.random() - 0.5) * 3;
        const ball = Bodies.circle(startX, PEG_START_Y - 22, BR, {
          restitution: 0.3,
          friction: 0.02,
          frictionAir: 0.008,
          density: 0.003,
          label: "ball",
        });
        Body.setVelocity(ball, { x: 0, y: 0.5 });
        return ball;
      });
      World.add(engine.world, ballBodies);

      // Per-ball state
      const ballStates = result.drops.map(() => ({
        lastRow: -1,
        rights: 0,
        landed: false,
      }));
      let allLanded = false;

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

                // Correct x position toward expected channel
                const correctX = ballXAtRow(state.rights, r, rows);
                const dx = correctX - ball.position.x;
                const clampedDx = Math.max(-PS * 0.35, Math.min(PS * 0.35, dx));
                Body.setPosition(ball, {
                  x: ball.position.x + clampedDx + (Math.random() - 0.5) * PS * 0.08,
                  y: ball.position.y,
                });

                Body.setVelocity(ball, {
                  x: sign * (Math.max(Math.abs(ball.velocity.x), 0.9) + Math.random() * 0.4),
                  y: Math.max(ball.velocity.y, 1.3),
                });

                if (dir === "R") state.rights++;
                break;
              }
            }
          }

          if (ball.position.y >= BY + BUCKET_H * 0.4 && !state.landed) {
            state.landed = true;
          }
        }

        if (!allLanded && ballStates.every(s => s.landed)) {
          allLanded = true;
          setTimeout(() => {
            let frame = 0;
            const glow = () => {
              frame++;
              for (const d of result.drops) {
                activeBucketsRef.current[d.bucketIdx] = Math.min(1, frame / 20);
              }
              if (frame < 20) {
                requestAnimationFrame(glow);
              } else {
                setTimeout(onAnimationComplete, 300);
              }
            };
            requestAnimationFrame(glow);
          }, 400);
        }
      });

      // RAF render loop
      const renderLoop = () => {
        // Append current positions to trails, trim to 14
        for (let i = 0; i < ballBodies.length; i++) {
          const pos = ballBodies[i].position;
          trailsRef.current[i].push({ x: pos.x, y: pos.y });
          if (trailsRef.current[i].length > 14) trailsRef.current[i].shift();
        }

        drawFrame(ctx, cfg, ballBodies, trailsRef.current, activeBucketsRef.current);
        rafRef.current = requestAnimationFrame(renderLoop);
      };
      rafRef.current = requestAnimationFrame(renderLoop);

      // Start physics runner
      const runner = Runner.create({ delta: 1000 / 60 });
      runnerRef.current = runner;
      Runner.run(runner, engine);
    });

    return () => {
      cancelAnimationFrame(setupFrame);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
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

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        borderRadius: 12,
        background: "#05050c",
      }}
    />
  );
}

// ── UI constants ──────────────────────────────────────────────────────────────
const RISK_COLOR: Record<PlinkoRisk, string> = {
  low:    "#22c55e",
  medium: "#f59e0b",
  high:   "#ef4444",
};
const VALID_COUNTS = [1, 3, 5, 10] as const;
type ValidCount = (typeof VALID_COUNTS)[number];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlinkoPage() {
  const [balance,    setBalance]    = useState<number | null>(null);
  const [rows,       setRows]       = useState<PlinkoRows>(16);
  const [risk,       setRisk]       = useState<PlinkoRisk>("medium");
  const [bet,        setBet]        = useState(50);
  const [numBalls,   setNumBalls]   = useState<ValidCount>(1);
  const [isDropping, setIsDropping] = useState(false);
  const [animKey,    setAnimKey]    = useState(0);
  const [result,     setResult]     = useState<DropResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Fetch balance on mount
  useEffect(() => {
    fetch("/api/cases/balance")
      .then(r => r.json())
      .then(d => { if (d.balance !== null) setBalance(d.balance); });
  }, []);

  const totalBet = bet * numBalls;
  const maxMult  = MULTIPLIERS[rows][risk][0];

  // Memoize animKey to avoid stale closure issues in PlinkoBoard key
  const boardKey = useMemo(() => rows, [rows]);

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

  const canDrop = !isDropping && balance !== null && balance >= totalBet;

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
                      color:      rows === r ? "#fff" : "#6b7280",
                      border:     rows === r ? "1px solid #f97316" : "1px solid #ffffff10",
                      boxShadow:  rows === r ? "0 0 12px #f9731640" : "none",
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
                        color:      risk === r ? "#fff" : "#6b7280",
                        border:     risk === r ? `1px solid ${color}` : "1px solid #ffffff10",
                        boxShadow:  risk === r ? `0 0 12px ${color}50` : "none",
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
                      color:      numBalls === n ? "#fff" : "#6b7280",
                      border:     numBalls === n ? "1px solid #a855f7" : "1px solid #ffffff10",
                      boxShadow:  numBalls === n ? "0 0 12px #a855f750" : "none",
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
                      color:      bet === b ? "#fff" : "#6b7280",
                      border:     bet === b ? "1px solid #f97316" : "1px solid #ffffff10",
                      boxShadow:  bet === b ? "0 0 12px #f9731640" : "none",
                    }}
                  >
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

          {/* Board */}
          <div className="px-3 py-4">
            <PlinkoBoard
              key={boardKey}
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
                  <p className="text-lg font-black text-red-500">−{result.totalBet.toLocaleString()} ₱</p>
                  <p className="text-xs text-gray-600 font-mono">≈ {toUSD(result.totalBet)}</p>
                </>
              )}
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
                background: canDrop
                  ? "linear-gradient(135deg, #f97316, #ea580c)"
                  : "#1f1f2e",
                color:     canDrop ? "#fff" : "#374151",
                boxShadow: canDrop ? "0 0 30px #f9731640, 0 4px 20px rgba(0,0,0,0.4)" : "none",
                cursor:    canDrop ? "pointer" : "not-allowed",
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
