"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { CASE_ITEMS, RARITY_LABEL, CASE_COST, type CaseItemDef } from "@/lib/caseItems";

const ITEM_W = 120;   // px per roulette card (108px + 12px gap)
const STRIP_LEN = 80; // total items in roulette strip
const LAND_IDX = 68;  // index where winner lands (near end)
const SPIN_MS = 5200; // animation duration

function buildStrip(winner: CaseItemDef): CaseItemDef[] {
  const strip: CaseItemDef[] = [];
  for (let i = 0; i < STRIP_LEN; i++) {
    strip.push(CASE_ITEMS[Math.floor(Math.random() * CASE_ITEMS.length)]);
  }
  strip[LAND_IDX] = winner;
  return strip;
}

function rarityGlow(color: string) {
  return `0 0 20px ${color}66, 0 0 40px ${color}33`;
}

interface UserItemEntry {
  id: string;
  obtainedAt: string;
  item: CaseItemDef;
}

interface RecentDrop {
  id: string;
  obtainedAt: string;
  sold: boolean;
  username: string;
  avatar: string;
  item: CaseItemDef;
}

export default function CasesPage() {
  const [tab, setTab] = useState<"open" | "stash" | "recent">("open");
  const [balance, setBalance] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<CaseItemDef[]>([]);
  const [showStrip, setShowStrip] = useState(false);
  const [result, setResult] = useState<{ item: CaseItemDef; userItemId: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sellMsg, setSellMsg] = useState<string | null>(null);

  const [stash, setStash] = useState<UserItemEntry[] | null>(null);
  const [recent, setRecent] = useState<RecentDrop[] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const fetchBalance = useCallback(async () => {
    const res = await fetch("/api/cases/balance");
    if (res.ok) {
      const data = await res.json();
      if (data.balance !== null) setBalance(data.balance);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetch("/api/cases/inventory").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setStash(d);
    });
    fetch("/api/cases/recent").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setRecent(d);
    });
  }, [fetchBalance]);

  async function openCase() {
    if (spinning) return;
    setSpinning(true);
    setShowResult(false);
    setResult(null);
    setSellMsg(null);

    let data: { item: CaseItemDef; userItemId: string; newBalance: number } | null = null;
    try {
      const res = await fetch("/api/cases/open", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Failed to open case");
        setSpinning(false);
        return;
      }
      data = await res.json();
    } catch {
      setSpinning(false);
      return;
    }

    setBalance(data!.newBalance);

    // Build strip with winner at LAND_IDX
    const newStrip = buildStrip(data!.item);
    setStrip(newStrip);
    setShowStrip(true);

    // Wait one frame for strip to mount, then animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = stripRef.current;
        const cw = containerRef.current?.offsetWidth ?? 800;
        if (!el) return;

        const startX = cw / 2 - ITEM_W / 2; // item 0 at center
        const endX = -(LAND_IDX * ITEM_W) + cw / 2 - ITEM_W / 2;

        el.style.transition = "none";
        el.style.transform = `translateX(${startX}px)`;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.12, 0, 0.0, 1)`;
            el.style.transform = `translateX(${endX}px)`;
          });
        });

        setTimeout(() => {
          setResult({ item: data!.item, userItemId: data!.userItemId });
          setShowResult(true);
          setSpinning(false);
          // Refresh stash
          fetch("/api/cases/inventory").then(r => r.json()).then(d => {
            if (Array.isArray(d)) setStash(d);
          });
          // Refresh recent drops
          fetch("/api/cases/recent").then(r => r.json()).then(d => {
            if (Array.isArray(d)) setRecent(d);
          });
        }, SPIN_MS + 300);
      });
    });
  }

  async function sellItem(userItemId: string, expectedValue: number) {
    const res = await fetch(`/api/cases/inventory/sell/${userItemId}`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setBalance(data.newBalance);
    setSellMsg(`Sold for ${expectedValue.toLocaleString()} ₱`);
    setResult(null);
    setShowStrip(false);
    // Refresh stash
    fetch("/api/cases/inventory").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setStash(d);
    });
  }

  async function sellStashItem(id: string, sellValue: number) {
    const res = await fetch(`/api/cases/inventory/sell/${id}`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setBalance(data.newBalance);
    setStash((prev) => prev?.filter((i) => i.id !== id) ?? []);
  }

  function loadTab(t: "open" | "stash" | "recent") {
    setTab(t);
    if (t === "stash") {
      fetch("/api/cases/inventory").then(r => r.json()).then(d => {
        if (Array.isArray(d)) setStash(d);
      });
    }
    if (t === "recent") {
      fetch("/api/cases/recent").then(r => r.json()).then(d => {
        if (Array.isArray(d)) setRecent(d);
      });
    }
  }

  const canOpen = balance !== null && balance >= CASE_COST && !spinning;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-black text-white">
                Psyko <span className="text-orange-500">Cases</span>
              </h1>
              <p className="text-gray-500 mt-1 text-sm">Open cases, collect skins, sell for coins</p>
            </div>
            {balance !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <span className="text-yellow-400 font-black text-xl">{balance.toLocaleString()}</span>
                <span className="text-yellow-500 text-sm font-bold">₱</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {(["open", "stash", "recent"] as const).map((t) => (
              <button
                key={t}
                onClick={() => loadTab(t)}
                className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  tab === t
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "open" ? "Open Case" : t === "stash" ? "My Stash" : "Recent Drops"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── OPEN TAB ── */}
        {tab === "open" && (
          <div className="space-y-8">
            {/* Case visual */}
            <div className="flex flex-col items-center gap-6">
              <div
                className="w-48 h-48 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300"
                style={{
                  borderColor: spinning ? "#f97316" : "#374151",
                  boxShadow: spinning ? "0 0 40px #f9731644, 0 0 80px #f9731622" : "none",
                  background: "linear-gradient(135deg, #0d0d15 0%, #1a1a2e 100%)",
                }}
              >
                <div className="text-5xl">{spinning ? "🎰" : "📦"}</div>
                <div className="text-xs font-black text-orange-500 uppercase tracking-widest">Psyko Case</div>
                <div className="text-xs text-gray-600">{CASE_COST} ₱ to open</div>
              </div>

              {/* Odds */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: "Mil-Spec", color: "#4b69ff", pct: "79.9%" },
                  { label: "Restricted", color: "#8847ff", pct: "15.9%" },
                  { label: "Classified", color: "#d32ce6", pct: "3.2%" },
                  { label: "Covert", color: "#eb4b4b", pct: "0.64%" },
                  { label: "Rare Special", color: "#ffd700", pct: "0.26%" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/50 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    <span className="text-gray-400">{r.label}</span>
                    <span className="text-gray-600">{r.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Roulette strip */}
            {showStrip && (
              <div className="relative" ref={containerRef}>
                {/* Center marker */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-0.5 bg-orange-500 z-10 pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-orange-500 z-10" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[10px] border-l-transparent border-r-transparent border-b-orange-500 z-10" />

                <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0a0a0f]" style={{ height: 140 }}>
                  <div ref={stripRef} className="flex gap-3 p-4 will-change-transform" style={{ width: `${STRIP_LEN * ITEM_W}px` }}>
                    {strip.map((item, i) => (
                      <div
                        key={i}
                        className="shrink-0 rounded-lg flex flex-col items-center justify-center gap-1 p-2 text-center"
                        style={{
                          width: 108,
                          height: 108,
                          background: `${item.color}18`,
                          borderWidth: 2,
                          borderStyle: "solid",
                          borderColor: i === LAND_IDX ? item.color : `${item.color}44`,
                          boxShadow: i === LAND_IDX ? rarityGlow(item.color) : "none",
                        }}
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <span className="text-[9px] text-gray-300 leading-tight font-medium line-clamp-2">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Result card */}
            {showResult && result && (
              <div
                className="rounded-2xl border-2 p-6 flex flex-col sm:flex-row items-center gap-6 transition-all"
                style={{
                  borderColor: result.item.color,
                  background: `${result.item.color}10`,
                  boxShadow: rarityGlow(result.item.color),
                }}
              >
                <div className="text-6xl">{result.item.emoji}</div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: result.item.color }}>
                    {RARITY_LABEL[result.item.rarity]}
                  </p>
                  <p className="text-xl font-black text-white">{result.item.name}</p>
                  <p className="text-sm text-gray-400 mt-1">Sell value: <span className="text-yellow-400 font-bold">{result.item.sellValue.toLocaleString()} ₱</span></p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => sellItem(result.userItemId, result.item.sellValue)}
                    className="px-4 py-2 text-sm font-bold rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                  >
                    Sell ({result.item.sellValue.toLocaleString()} ₱)
                  </button>
                  <button
                    onClick={() => { setShowResult(false); setShowStrip(false); }}
                    className="px-4 py-2 text-sm font-bold rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Keep
                  </button>
                </div>
              </div>
            )}

            {sellMsg && (
              <p className="text-center text-yellow-400 font-bold">{sellMsg}</p>
            )}

            {/* Open button */}
            <div className="flex justify-center">
              {balance === null ? (
                <p className="text-gray-500 text-sm">Sign in to open cases</p>
              ) : (
                <button
                  onClick={openCase}
                  disabled={!canOpen}
                  className={`px-10 py-4 text-lg font-black rounded-2xl transition-all uppercase tracking-wider ${
                    canOpen
                      ? "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
                      : "bg-gray-800 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  {spinning ? "Opening…" : balance < CASE_COST ? "Insufficient Balance" : `Open Case — ${CASE_COST} ₱`}
                </button>
              )}
            </div>

            {/* Item pool preview */}
            {!showStrip && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-3">Items in this case</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {CASE_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl p-3 flex items-center gap-3 border"
                      style={{ borderColor: `${item.color}33`, background: `${item.color}0d` }}
                    >
                      <span className="text-xl shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-300 truncate">{item.name}</p>
                        <p className="text-xs" style={{ color: item.color }}>{RARITY_LABEL[item.rarity]}</p>
                        <p className="text-xs text-yellow-500">{item.sellValue.toLocaleString()} ₱</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STASH TAB ── */}
        {tab === "stash" && (
          <div>
            {stash === null ? (
              <p className="text-gray-500 text-center py-12">Loading…</p>
            ) : stash.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-gray-400 font-bold text-lg">Your stash is empty</p>
                <p className="text-gray-600 text-sm mt-2">Open some cases to fill it up</p>
                <button
                  onClick={() => setTab("open")}
                  className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Open a Case
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-4">{stash.length} item{stash.length !== 1 ? "s" : ""} in your stash</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stash.map((ui) => (
                    <div
                      key={ui.id}
                      className="rounded-xl border p-4 flex items-center gap-4"
                      style={{ borderColor: `${ui.item.color}44`, background: `${ui.item.color}0d` }}
                    >
                      <span className="text-3xl">{ui.item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: ui.item.color }}>
                          {RARITY_LABEL[ui.item.rarity]}
                        </p>
                        <p className="text-sm font-bold text-white truncate">{ui.item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(ui.obtainedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => sellStashItem(ui.id, ui.item.sellValue)}
                        className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                      >
                        Sell<br />{ui.item.sellValue.toLocaleString()} ₱
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── RECENT DROPS TAB ── */}
        {tab === "recent" && (
          <div>
            {recent === null ? (
              <p className="text-gray-500 text-center py-12">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No drops yet — be the first to open a case!</p>
            ) : (
              <div className="space-y-2">
                {recent.map((drop) => (
                  <div
                    key={drop.id}
                    className="flex items-center gap-4 rounded-xl border p-3 transition-all"
                    style={{ borderColor: `${drop.item.color}33`, background: `${drop.item.color}08` }}
                  >
                    <Image
                      src={drop.avatar}
                      alt={drop.username}
                      width={36}
                      height={36}
                      className="rounded-full border border-gray-700 shrink-0"
                    />
                    <span className="text-2xl">{drop.item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-bold truncate">
                        <span className="text-orange-400">{drop.username}</span> unboxed{" "}
                        <span style={{ color: drop.item.color }}>{drop.item.name}</span>
                      </p>
                      <p className="text-xs text-gray-600">
                        {RARITY_LABEL[drop.item.rarity]} · {drop.item.sellValue.toLocaleString()} ₱ · {new Date(drop.obtainedAt).toLocaleString()}
                        {drop.sold && <span className="ml-2 text-gray-700">(sold)</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
