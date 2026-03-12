"use client";

import { useState, useRef, useEffect } from "react";
import { SLOT_SYMBOLS, SLOT_PAYOUTS, VALID_BETS, getSymbol, type SlotSymbol } from "@/lib/slotSymbols";
import { toUSD } from "@/lib/caseItems";

// ── Reel geometry ──────────────────────────────────────────────────────────────
const SYMBOL_H  = 96;
const VISIBLE   = 3;
const REEL_H    = SYMBOL_H * VISIBLE;   // 288px visible window
const STRIP_LEN = 44;
// Winner index per direction — keeps travel distance ~equal (~3552px)
const LAND_UP   = 38;  // scrolling up:   start Y=0,      end Y=-(37*96)=-3552
const LAND_DOWN = 4;   // scrolling down:  start Y=-3936,  end Y=-(3*96)=-288

// ── Win tier labels ────────────────────────────────────────────────────────────
function winLabel(mult: number): { text: string; color: string } | null {
  if (mult >= 500) return { text: "🎰 JACKPOT!! 🎰",  color: "#ffd700" };
  if (mult >= 100) return { text: "💎 MEGA WIN!! 💎", color: "#67e8f9" };
  if (mult >= 30)  return { text: "⭐ BIG WIN! ⭐",   color: "#f97316" };
  if (mult >= 5)   return { text: "WIN!",              color: "#4ade80" };
  if (mult > 0)    return { text: "Almost…",           color: "#6b7280" };
  return null;
}

// ── Build strip with winner placed at the correct index for the direction ──────
function buildStrip(winnerId: string, direction: "up" | "down"): SlotSymbol[] {
  const landIdx = direction === "up" ? LAND_UP : LAND_DOWN;
  const rand = () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  return Array.from({ length: STRIP_LEN }, (_, i) =>
    i === landIdx ? getSymbol(winnerId) : rand()
  );
}

// ── Symbol cell ────────────────────────────────────────────────────────────────
function SymbolCell({ sym }: { sym: SlotSymbol }) {
  return (
    <div className="flex flex-col items-center justify-center select-none"
      style={{ height: SYMBOL_H }}>
      {sym.isText ? (
        <span className="font-black leading-none"
          style={{
            fontSize: sym.id === "seven" ? 52 : 28,
            color: sym.color,
            textShadow: `0 0 20px ${sym.color}88, 0 0 40px ${sym.color}44`,
          }}>
          {sym.display}
        </span>
      ) : (
        <span style={{ fontSize: 44, lineHeight: 1, filter: `drop-shadow(0 0 8px ${sym.color}88)` }}>
          {sym.display}
        </span>
      )}
      <span className="font-bold uppercase tracking-widest mt-1"
        style={{ fontSize: 9, color: `${sym.color}99` }}>
        {sym.label}
      </span>
    </div>
  );
}

// ── Reel — remounted each spin via key, animates once on mount ────────────────
function Reel({
  strip,
  direction,
  duration,
  onStopped,
  winColor,
}: {
  strip: SlotSymbol[];
  direction: "up" | "down";
  duration: number;
  onStopped: () => void;
  winColor: string | null;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const landIdx  = direction === "up" ? LAND_UP : LAND_DOWN;
    // Translate so landIdx symbol sits in the MIDDLE (row 1) of the 3-row window
    const endY     = -(landIdx - 1) * SYMBOL_H;
    const startY   = direction === "up"
      ? 0                                      // top of strip
      : -(STRIP_LEN - VISIBLE) * SYMBOL_H;    // bottom of strip

    // 1. Snap to start without any transition
    el.style.transition = "none";
    el.style.transform  = `translateY(${startY}px)`;

    // 2. Force reflow so browser commits the snap before we set the transition
    void el.getBoundingClientRect();

    // 3. Apply transition to final position
    el.style.transition = `transform ${duration}ms cubic-bezier(0.08, 0.92, 0.28, 1)`;
    el.style.transform  = `translateY(${endY}px)`;

    const t = setTimeout(() => { setDone(true); onStopped(); }, duration + 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount

  return (
    <div className="relative overflow-hidden rounded-lg"
      style={{
        width: 130, height: REEL_H,
        background: "linear-gradient(180deg, #06060e 0%, #0d0d1a 50%, #06060e 100%)",
        boxShadow: winColor
          ? `inset 0 0 0 2px ${winColor}, 0 0 30px ${winColor}66`
          : "inset 0 0 0 1px #ffffff10",
        transition: "box-shadow 0.5s",
      }}>

      {/* Top/bottom fades */}
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: SYMBOL_H * 0.65, background: "linear-gradient(to bottom, #06060e, transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: SYMBOL_H * 0.65, background: "linear-gradient(to top, #06060e, transparent)" }} />

      {/* Direction arrow indicator */}
      {!done && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 text-gray-700 text-xs pointer-events-none">
          {direction === "up" ? "▲" : "▼"}
        </div>
      )}

      <div ref={innerRef} style={{ willChange: "transform" }}>
        {strip.map((sym, i) => <SymbolCell key={i} sym={sym} />)}
      </div>
    </div>
  );
}

// ── Paytable row ───────────────────────────────────────────────────────────────
function PayRow({ sym, three, two }: { sym: SlotSymbol; three: number; two?: number }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg"
      style={{ background: `${sym.color}0a`, borderLeft: `2px solid ${sym.color}60` }}>
      <div className="flex gap-0.5 shrink-0">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: `${sym.color}18`, border: `1px solid ${sym.color}30` }}>
            {sym.isText ? (
              <span className="font-black leading-none"
                style={{ fontSize: sym.id === "seven" ? 14 : 10, color: sym.color }}>
                {sym.display}
              </span>
            ) : (
              <span style={{ fontSize: 14 }}>{sym.display}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold" style={{ color: sym.color }}>{sym.label}</span>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-black text-yellow-400">{three}×</span>
        {two !== undefined && <span className="text-xs text-gray-500 ml-2">({two}× pair)</span>}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
type SpinState = {
  strips: SlotSymbol[][];
  directions: ("up" | "down")[];
  durations: number[];
  result: {
    reels: [string, string, string];
    multiplier: number;
    winType: string | null;
    winnings: number;
    delta: number;
    bet: number;
    balance: number;
  };
};

export default function SlotsPage() {
  const [balance, setBalance]       = useState<number | null>(null);
  const [bet, setBet]               = useState(50);
  const [spinKey, setSpinKey]       = useState(0);   // increment → remounts reels
  const [spinState, setSpinState]   = useState<SpinState | null>(null);
  const [stoppedCount, setStoppedCount] = useState(0);
  const [winColors, setWinColors]   = useState<(string | null)[]>([null, null, null]);
  const [showResult, setShowResult] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showPaytable, setShowPaytable] = useState(false);
  const isSpinning = spinState !== null && stoppedCount < 3;

  useEffect(() => {
    fetch("/api/cases/balance").then(r => r.json()).then(d => {
      if (d.balance !== null) setBalance(d.balance);
    });
  }, []);

  // When all 3 reels stop, reveal result
  useEffect(() => {
    if (!spinState || stoppedCount < 3) return;
    const { result } = spinState;

    setBalance(result.balance);
    setShowResult(true);

    if (result.multiplier > 0) {
      const wt = result.winType ?? "";
      if (wt.startsWith("triple-")) {
        const col = getSymbol(wt.replace("triple-", "")).color;
        setWinColors([col, col, col]);
      } else if (wt.startsWith("pair23-")) {
        const col = getSymbol(wt.replace("pair23-", "")).color;
        setWinColors([null, col, col]);
      } else if (wt.startsWith("pair-")) {
        const col = getSymbol(wt.replace("pair-", "")).color;
        setWinColors([col, col, null]);
      } else {
        // cherry
        setWinColors(["#dc2626", "#dc2626", "#dc2626"]);
      }
    }
  }, [stoppedCount, spinState]);

  const spin = async () => {
    if (isSpinning) return;
    setError(null);
    setShowResult(false);
    setWinColors([null, null, null]);
    setStoppedCount(0);
    setSpinState(null);

    const res  = await fetch("/api/slots/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error"); return; }

    // Deduct bet locally while spinning
    setBalance(prev => prev === null ? null : prev - bet);

    // Randomly assign direction and duration to each reel
    const directions = [0, 1, 2].map(() =>
      Math.random() > 0.5 ? "up" : "down"
    ) as ("up" | "down")[];

    // Shuffle stop order: any reel can stop first/last
    const baseDurations = [2000, 2800, 3600];
    const shuffled      = [...baseDurations].sort(() => Math.random() - 0.5);

    const strips = directions.map((dir, i) => buildStrip(data.reels[i], dir));

    setSpinState({ strips, directions, durations: shuffled, result: data });
    setSpinKey(k => k + 1);
  };

  const result = showResult ? spinState?.result ?? null : null;
  const label  = result ? winLabel(result.multiplier) : null;
  const canSpin = !isSpinning && balance !== null && balance >= bet;

  return (
    <div className="min-h-screen px-4 py-8"
      style={{ background: "linear-gradient(160deg, #0a0a0f 0%, #0d0d1a 100%)" }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-widest uppercase"
            style={{ color: "#f97316", textShadow: "0 0 30px #f9731666, 0 0 60px #f9731633" }}>
            Psyko Slots
          </h1>
          <p className="text-gray-600 text-sm mt-1 tracking-widest uppercase">Las Vegas Style</p>
        </div>

        {/* Cabinet */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #1a1a2e 0%, #0d0d18 100%)",
            border: "2px solid #f9731630",
            boxShadow: "0 0 60px #f9731615, inset 0 1px 0 #f9731620",
          }}>

          {/* Balance bar */}
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

          {/* Win banner */}
          <div className="h-12 flex items-center justify-center"
            style={{ background: label ? `${label.color}15` : "transparent", transition: "background 0.4s" }}>
            {label ? (
              <span className="text-xl font-black tracking-widest animate-pulse"
                style={{ color: label.color, textShadow: `0 0 20px ${label.color}` }}>
                {label.text}
              </span>
            ) : (
              <span className="text-xs text-gray-700 uppercase tracking-widest">
                {isSpinning ? "Spinning…" : "Good luck!"}
              </span>
            )}
          </div>

          {/* Reel frame */}
          <div className="px-6 pb-4">
            <div className="rounded-xl p-4 relative"
              style={{
                background: "linear-gradient(180deg, #050508 0%, #090914 100%)",
                border: "1px solid #ffffff08",
                boxShadow: "inset 0 4px 20px rgba(0,0,0,0.8)",
              }}>

              {/* Payline arrows */}
              <div className="absolute left-1 right-1 pointer-events-none z-20 flex justify-between items-center"
                style={{ top: SYMBOL_H + 16 + SYMBOL_H / 2 - 8 }}>
                <div className="w-0 h-0"
                  style={{ borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "10px solid #f59e0b" }} />
                <div className="w-0 h-0"
                  style={{ borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "10px solid #f59e0b" }} />
              </div>

              {/* Payline */}
              <div className="absolute inset-x-0 pointer-events-none z-10"
                style={{
                  top: SYMBOL_H + 16 + SYMBOL_H / 2,
                  height: 1,
                  background: result && result.multiplier > 0
                    ? `linear-gradient(to right, transparent, ${label?.color ?? "#f59e0b"}, transparent)`
                    : "linear-gradient(to right, transparent, #f59e0b55, transparent)",
                  boxShadow: result && result.multiplier > 0 ? `0 0 12px ${label?.color}` : "none",
                  transition: "background 0.4s, box-shadow 0.4s",
                }} />

              {/* Reels */}
              <div className="flex gap-3 justify-center">
                {[0, 1, 2].map(idx => spinState ? (
                  <Reel
                    key={`${spinKey}-${idx}`}
                    strip={spinState.strips[idx]}
                    direction={spinState.directions[idx]}
                    duration={spinState.durations[idx]}
                    onStopped={() => setStoppedCount(c => c + 1)}
                    winColor={winColors[idx]}
                  />
                ) : (
                  /* Idle reel — shows a static placeholder */
                  <div key={idx} className="rounded-lg flex flex-col items-center justify-center gap-0"
                    style={{
                      width: 130, height: REEL_H,
                      background: "linear-gradient(180deg, #06060e 0%, #0d0d1a 50%, #06060e 100%)",
                      boxShadow: "inset 0 0 0 1px #ffffff10",
                    }}>
                    {["⭐", "🎰", "💎"].map((e, i) => (
                      <div key={i} className="flex items-center justify-center"
                        style={{ height: SYMBOL_H, opacity: i === 1 ? 1 : 0.3, fontSize: i === 1 ? 44 : 36 }}>
                        {e}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Win / loss display */}
          {showResult && result && (
            <div className="mx-6 mb-4 rounded-xl px-4 py-3 text-center"
              style={{
                background: result.multiplier > 0 ? "#4ade8010" : "#ef444410",
                border: `1px solid ${result.multiplier > 0 ? "#4ade8030" : "#ef444430"}`,
              }}>
              {result.multiplier > 0 ? (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">You won</p>
                  <p className="text-2xl font-black text-green-400">+{result.winnings.toLocaleString()} ₱</p>
                  <p className="text-xs text-gray-600 font-mono">≈ {toUSD(result.winnings)} · {result.multiplier}× multiplier</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">No win</p>
                  <p className="text-lg font-black text-red-500">-{result.bet.toLocaleString()} ₱</p>
                </>
              )}
            </div>
          )}

          {error && <p className="mx-6 mb-4 text-center text-red-400 text-sm font-bold">{error}</p>}

          {/* Bet selector */}
          <div className="px-6 pb-4">
            <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-2 text-center">Bet Amount</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {VALID_BETS.map(b => (
                <button key={b} onClick={() => { if (!isSpinning) setBet(b); }}
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
            <p className="text-center text-xs text-gray-700 font-mono mt-1.5">≈ {toUSD(bet)} per spin</p>
          </div>

          {/* Spin button */}
          <div className="px-6 pb-6">
            <button onClick={spin} disabled={!canSpin}
              className="w-full py-4 rounded-xl text-xl font-black uppercase tracking-widest transition-all"
              style={{
                background: canSpin ? "linear-gradient(135deg, #f97316, #ea580c)" : "#1f1f2e",
                color: canSpin ? "#fff" : "#374151",
                boxShadow: canSpin ? "0 0 30px #f9731640, 0 4px 20px rgba(0,0,0,0.4)" : "none",
                transform: isSpinning ? "scale(0.98)" : "scale(1)",
                cursor: canSpin ? "pointer" : "not-allowed",
              }}>
              {balance === null
                ? "Sign in to play"
                : isSpinning
                ? "Spinning…"
                : balance < bet
                ? "Insufficient Balance"
                : "SPIN"}
            </button>
          </div>
        </div>

        {/* Paytable */}
        <div className="mt-4">
          <button onClick={() => setShowPaytable(p => !p)}
            className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2">
            <span>{showPaytable ? "▲" : "▼"}</span> Paytable <span>{showPaytable ? "▲" : "▼"}</span>
          </button>

          {showPaytable && (
            <div className="rounded-2xl overflow-hidden mt-2"
              style={{ background: "#0d0d18", border: "1px solid #ffffff08" }}>
              <div className="px-4 py-3 border-b border-white/5 text-center">
                <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">Winning Combinations</p>
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {SLOT_SYMBOLS.map(sym => {
                  const p = SLOT_PAYOUTS[sym.id];
                  if (!p) return null;
                  return <PayRow key={sym.id} sym={sym} three={p.three} two={p.two} />;
                })}
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg"
                  style={{ background: "#dc262608", borderLeft: "2px solid #dc262640" }}>
                  <div className="flex gap-1 shrink-0 items-center">
                    <div className="w-7 h-7 rounded flex items-center justify-center"
                      style={{ background: "#dc262618", border: "1px solid #dc262630" }}>
                      <span style={{ fontSize: 14 }}>🍒</span>
                    </div>
                    <span className="text-gray-700 text-xs font-bold">+ any + any</span>
                  </div>
                  <div className="flex-1"><span className="text-xs font-bold" style={{ color: "#dc2626" }}>Any Cherry</span></div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-yellow-400">0.5×</span>
                    <span className="text-xs text-gray-600 ml-1">(half back)</span>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-3 text-center">
                <p className="text-xs text-gray-700">Reels 1+2 pair = full payout · Reels 2+3 pair = ½ payout · Any cherry = ½ bet back</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
