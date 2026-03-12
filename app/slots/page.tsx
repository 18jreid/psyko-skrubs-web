"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SLOT_SYMBOLS, SLOT_PAYOUTS, VALID_BETS, getSymbol, type SlotSymbol } from "@/lib/slotSymbols";
import { toUSD } from "@/lib/caseItems";

// ── Reel geometry ──────────────────────────────────────────────────────────────
const SYMBOL_H   = 96;   // px per symbol cell
const VISIBLE    = 3;    // rows visible per reel
const REEL_H     = SYMBOL_H * VISIBLE; // 288px
const STRIP_LEN  = 44;   // total symbols in the animated strip
const LAND_IDX   = 38;   // index where the winner lands (middle visible row)

// ── Win tier labels ────────────────────────────────────────────────────────────
function winLabel(multiplier: number): { text: string; color: string } | null {
  if (multiplier >= 500) return { text: "🎰 JACKPOT!! 🎰",  color: "#ffd700" };
  if (multiplier >= 100) return { text: "💎 MEGA WIN!! 💎", color: "#67e8f9" };
  if (multiplier >= 30)  return { text: "⭐ BIG WIN! ⭐",   color: "#f97316" };
  if (multiplier >= 5)   return { text: "WIN!",              color: "#4ade80" };
  if (multiplier > 0)    return { text: "Almost…",           color: "#6b7280" };
  return null;
}

// ── Single symbol cell ─────────────────────────────────────────────────────────
function SymbolCell({ sym, dim = false }: { sym: SlotSymbol; dim?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center select-none"
      style={{ height: SYMBOL_H, opacity: dim ? 0.35 : 1, transition: "opacity 0.3s" }}>
      {sym.isText ? (
        <span className="font-black leading-none"
          style={{ fontSize: sym.id === "seven" ? 52 : 28, color: sym.color,
            textShadow: `0 0 20px ${sym.color}88, 0 0 40px ${sym.color}44` }}>
          {sym.display}
        </span>
      ) : (
        <span style={{ fontSize: 44, lineHeight: 1, filter: `drop-shadow(0 0 8px ${sym.color}88)` }}>
          {sym.display}
        </span>
      )}
      <span className="text-xs font-bold tracking-widest uppercase mt-1"
        style={{ color: `${sym.color}99`, fontSize: 9 }}>
        {sym.label}
      </span>
    </div>
  );
}

// ── Build a reel strip: random symbols with winner placed at LAND_IDX ─────────
function buildStrip(winnerId: string): SlotSymbol[] {
  const all = SLOT_SYMBOLS;
  const rand = () => all[Math.floor(Math.random() * all.length)];
  return Array.from({ length: STRIP_LEN }, (_, i) =>
    i === LAND_IDX ? getSymbol(winnerId) : rand()
  );
}

// ── A single animated reel ─────────────────────────────────────────────────────
function Reel({
  strip,
  spinning,
  stopped,
  stopDelay,
  onStopped,
  winColor,
}: {
  strip: SlotSymbol[];
  spinning: boolean;
  stopped: boolean;
  stopDelay: number;
  onStopped: () => void;
  winColor: string | null;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    if (!spinning) {
      // Reset to top for next spin
      el.style.transition = "none";
      el.style.transform = "translateY(0)";
      stoppedRef.current = false;
      return;
    }

    // Start animation: no transition initially, position at 0
    el.style.transition = "none";
    el.style.transform = "translateY(0)";

    // Target: LAND_IDX symbol in the MIDDLE (index 1) of the 3 visible rows
    // Middle row starts at 1 * SYMBOL_H from top of window
    // LAND_IDX symbol starts at LAND_IDX * SYMBOL_H from top of strip
    // translateY = -(LAND_IDX - 1) * SYMBOL_H
    const targetY = -(LAND_IDX - 1) * SYMBOL_H;

    const timer = setTimeout(() => {
      if (!innerRef.current || stoppedRef.current) return;
      stoppedRef.current = true;
      innerRef.current.style.transition = `transform 1600ms cubic-bezier(0.08, 0.92, 0.28, 1)`;
      innerRef.current.style.transform = `translateY(${targetY}px)`;
      setTimeout(onStopped, 1650);
    }, stopDelay);

    return () => clearTimeout(timer);
  }, [spinning, stopDelay, onStopped]);

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
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{ height: SYMBOL_H * 0.6, background: "linear-gradient(to bottom, #06060e, transparent)" }} />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{ height: SYMBOL_H * 0.6, background: "linear-gradient(to top, #06060e, transparent)" }} />

      {/* Spinning blur overlay */}
      {spinning && !stopped && (
        <div className="absolute inset-0 z-20 pointer-events-none"
          style={{ backdropFilter: "blur(1px)", opacity: stopped ? 0 : 0.4, transition: "opacity 0.5s" }} />
      )}

      <div ref={innerRef} style={{ willChange: "transform" }}>
        {strip.map((sym, i) => (
          <SymbolCell key={i} sym={sym} dim={stopped && Math.abs(i - LAND_IDX) > 1} />
        ))}
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
        {[0,1,2].map(i => (
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
        {two !== undefined && (
          <span className="text-xs text-gray-500 ml-2">({two}× pair)</span>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SlotsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [bet, setBet] = useState<number>(50);
  const [spinning, setSpinning] = useState(false);
  const [strips, setStrips] = useState<SlotSymbol[][]>([[], [], []]);
  const [stoppedReels, setStoppedReels] = useState([false, false, false]);
  const [winResult, setWinResult] = useState<{
    reels: [string, string, string];
    multiplier: number;
    winType: string | null;
    winnings: number;
    delta: number;
    bet: number;
    balance: number;
  } | null>(null);
  const [winColors, setWinColors] = useState<[string | null, string | null, string | null]>([null, null, null]);
  const [error, setError] = useState<string | null>(null);
  const [showPaytable, setShowPaytable] = useState(false);
  const pendingResult = useRef<typeof winResult>(null);
  const stoppedCount = useRef(0);

  useEffect(() => {
    fetch("/api/cases/balance").then(r => r.json()).then(d => {
      if (d.balance !== null) setBalance(d.balance);
    });
  }, []);

  const handleAllStopped = useCallback(() => {
    const result = pendingResult.current;
    if (!result) return;
    setWinResult(result);
    setBalance(prev => prev === null ? null : prev + result.delta);

    // Highlight winning reels
    if (result.multiplier > 0) {
      const winType = result.winType ?? "";
      const isTwoOfAKind = winType.startsWith("pair-");
      const symId = winType.replace("triple-", "").replace("pair-", "").replace("cherry", "cherry");
      const sym = getSymbol(symId === "cherry" ? "cherry" : symId);
      const cols: [string | null, string | null, string | null] = [
        sym.color,
        sym.color,
        isTwoOfAKind ? null : sym.color,
      ];
      setWinColors(cols);
    }
  }, []);

  const handleReelStopped = useCallback((idx: number) => {
    setStoppedReels(prev => {
      const next = [...prev] as [boolean, boolean, boolean];
      next[idx] = true;
      return next;
    });
    stoppedCount.current += 1;
    if (stoppedCount.current === 3) {
      handleAllStopped();
    }
  }, [handleAllStopped]);

  const spin = async () => {
    if (spinning) return;
    setError(null);
    setWinResult(null);
    setWinColors([null, null, null]);
    setSpinning(false); // force reset

    // Brief reset frame before starting
    await new Promise(r => setTimeout(r, 50));

    // Call API first to get result
    const res = await fetch("/api/slots/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error"); return; }

    // Build strips with result
    const newStrips: SlotSymbol[][] = [
      buildStrip(data.reels[0]),
      buildStrip(data.reels[1]),
      buildStrip(data.reels[2]),
    ];
    setStrips(newStrips);
    setStoppedReels([false, false, false]);
    stoppedCount.current = 0;
    pendingResult.current = data;

    // Subtract bet from local balance immediately
    setBalance(prev => prev === null ? null : prev - bet);

    setSpinning(true);
  };

  const isSpinning = spinning && !stoppedReels.every(Boolean);
  const canSpin = !isSpinning && (balance === null || balance >= bet);
  const label = winResult ? winLabel(winResult.multiplier) : null;

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

        {/* Machine cabinet */}
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

          {/* Reels */}
          <div className="px-6 pb-4">
            {/* Reel frame */}
            <div className="rounded-xl p-4 relative"
              style={{
                background: "linear-gradient(180deg, #050508 0%, #090914 100%)",
                border: "1px solid #ffffff08",
                boxShadow: "inset 0 4px 20px rgba(0,0,0,0.8)",
              }}>

              {/* Payline indicator arrows */}
              <div className="absolute left-1 right-1 pointer-events-none z-10"
                style={{ top: SYMBOL_H + 16 + (SYMBOL_H / 2) - 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="w-0 h-0" style={{ borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "10px solid #f59e0b" }} />
                <div className="w-0 h-0" style={{ borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "10px solid #f59e0b" }} />
              </div>

              {/* Payline line */}
              <div className="absolute left-0 right-0 pointer-events-none z-10"
                style={{
                  top: SYMBOL_H + 16 + (SYMBOL_H / 2),
                  height: 1,
                  background: winResult && winResult.multiplier > 0
                    ? `linear-gradient(to right, transparent, ${label?.color ?? "#f59e0b"}, transparent)`
                    : "linear-gradient(to right, transparent, #f59e0b55, transparent)",
                  transition: "background 0.4s",
                  boxShadow: winResult && winResult.multiplier > 0 ? `0 0 10px ${label?.color}` : "none",
                }} />

              {/* The 3 reels */}
              <div className="flex gap-3 justify-center">
                {[0, 1, 2].map(idx => (
                  <Reel
                    key={idx}
                    strip={strips[idx].length > 0 ? strips[idx] : Array.from({ length: STRIP_LEN }, () => getSymbol("orange"))}
                    spinning={spinning}
                    stopped={stoppedReels[idx]}
                    stopDelay={1200 + idx * 900}
                    onStopped={() => {
                      handleReelStopped(idx);
                      if (idx === 2) setSpinning(false);
                    }}
                    winColor={winColors[idx]}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Win amount display */}
          {winResult && (
            <div className="mx-6 mb-4 rounded-xl px-4 py-3 text-center"
              style={{
                background: winResult.multiplier > 0 ? "#4ade8010" : "#ef444410",
                border: `1px solid ${winResult.multiplier > 0 ? "#4ade8030" : "#ef444430"}`,
              }}>
              {winResult.multiplier > 0 ? (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">You won</p>
                  <p className="text-2xl font-black text-green-400">+{winResult.winnings.toLocaleString()} ₱</p>
                  <p className="text-xs text-gray-600 font-mono">≈ {toUSD(winResult.winnings)} · {winResult.multiplier}× multiplier</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">No win</p>
                  <p className="text-lg font-black text-red-500">-{winResult.bet.toLocaleString()} ₱</p>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="mx-6 mb-4 text-center text-red-400 text-sm font-bold">{error}</p>
          )}

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
            <button onClick={spin} disabled={!canSpin || balance === null}
              className="w-full py-4 rounded-xl text-xl font-black uppercase tracking-widest transition-all"
              style={{
                background: canSpin && balance !== null
                  ? "linear-gradient(135deg, #f97316, #ea580c)"
                  : "#1f1f2e",
                color: canSpin && balance !== null ? "#fff" : "#374151",
                boxShadow: canSpin && balance !== null
                  ? "0 0 30px #f9731640, 0 4px 20px rgba(0,0,0,0.4)"
                  : "none",
                transform: canSpin && !isSpinning ? "scale(1)" : "scale(0.98)",
                cursor: canSpin && balance !== null ? "pointer" : "not-allowed",
              }}>
              {balance === null ? "Sign in to play" : isSpinning ? "Spinning…" : balance < bet ? "Insufficient Balance" : "SPIN"}
            </button>
          </div>
        </div>

        {/* Paytable toggle */}
        <div className="mt-4">
          <button onClick={() => setShowPaytable(p => !p)}
            className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2">
            <span>{showPaytable ? "▲" : "▼"}</span>
            Paytable
            <span>{showPaytable ? "▲" : "▼"}</span>
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
                {/* Cherry consolation */}
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg"
                  style={{ background: "#dc262608", borderLeft: "2px solid #dc262640" }}>
                  <div className="flex gap-1 shrink-0 items-center">
                    <div className="w-7 h-7 rounded flex items-center justify-center"
                      style={{ background: "#dc262618", border: "1px solid #dc262630" }}>
                      <span style={{ fontSize: 14 }}>🍒</span>
                    </div>
                    <span className="text-gray-700 text-xs">+</span>
                    <span className="text-gray-700 text-xs font-bold">any</span>
                    <span className="text-gray-700 text-xs">+</span>
                    <span className="text-gray-700 text-xs font-bold">any</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold" style={{ color: "#dc2626" }}>Any Cherry</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-yellow-400">0.5×</span>
                    <span className="text-xs text-gray-600 ml-1">(half back)</span>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-3 text-center">
                <p className="text-xs text-gray-700">
                  Pair = first two reels match · Any single cherry = ½ bet back
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
