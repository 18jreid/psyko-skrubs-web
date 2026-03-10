"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { RARITY_LABEL, CASE_COST, weightedRandom, type CaseItemDef } from "@/lib/caseItems";

const ITEM_W = 132;   // px per roulette card (120px + 12px gap)
const STRIP_LEN = 80;
const LAND_IDX = 68;  // winner lands here — enough runway to feel dramatic
const SPIN_MS = 6000; // slightly longer for that satisfying slowdown

/**
 * Build the roulette strip using the same weighted distribution as the
 * actual drop system — Mil-Spec items dominate (~80%), making a Covert
 * or Rare Special stand out exactly as it would in CS2.
 *
 * A random sub-card offset (±40px) is returned separately so the reel
 * never stops at the exact center pixel twice in a row.
 */
function buildStrip(winner: CaseItemDef): { strip: CaseItemDef[]; offset: number } {
  const strip: CaseItemDef[] = [];
  for (let i = 0; i < STRIP_LEN; i++) {
    // Place winner at LAND_IDX; everything else is weighted-random
    strip.push(i === LAND_IDX ? winner : weightedRandom());
  }
  // Random offset within ±40 px so landing position varies every open
  const offset = (Math.random() - 0.5) * 80;
  return { strip, offset };
}

function rarityGlow(color: string) {
  return `0 0 24px ${color}88, 0 0 48px ${color}44`;
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

function ItemImage({
  item,
  imageMap,
  size = 80,
  className = "",
}: {
  item: CaseItemDef;
  imageMap: Record<string, string | null>;
  size?: number;
  className?: string;
}) {
  const src = imageMap[item.id];
  if (src) {
    return (
      <img
        src={src}
        alt={item.name}
        width={size}
        height={Math.round(size * 0.75)}
        className={`object-contain drop-shadow-lg ${className}`}
        style={{ imageRendering: "auto" }}
      />
    );
  }
  return <span className="text-4xl">{item.emoji}</span>;
}

export default function CasesPage() {
  const [tab, setTab] = useState<"open" | "stash" | "recent">("open");
  const [balance, setBalance] = useState<number | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

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

  // Fetch balance, images, stash, and recent on mount
  useEffect(() => {
    fetch("/api/cases/balance").then(r => r.json()).then(d => {
      if (d.balance !== null) setBalance(d.balance);
    });
    fetch("/api/cases/items").then(r => r.json()).then(d => {
      setImageMap(d);
      setImagesLoaded(true);
    }).catch(() => setImagesLoaded(true));
    fetch("/api/cases/inventory").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setStash(d);
    });
    fetch("/api/cases/recent").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setRecent(d);
    });
  }, []);

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
    const { strip: newStrip, offset: landOffset } = buildStrip(data!.item);
    setStrip(newStrip);
    setShowStrip(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = stripRef.current;
        const cw = containerRef.current?.offsetWidth ?? 800;
        if (!el) return;

        const startX = cw / 2 - ITEM_W / 2;
        // landOffset shifts the stopping point randomly within the card
        const endX = -(LAND_IDX * ITEM_W) + cw / 2 - ITEM_W / 2 + landOffset;

        el.style.transition = "none";
        el.style.transform = `translateX(${startX}px)`;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // CS2-style curve: explosive start, heavy deceleration near end
            el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.07, 0, 0.0, 1)`;
            el.style.transform = `translateX(${endX}px)`;
          });
        });

        setTimeout(() => {
          setResult({ item: data!.item, userItemId: data!.userItemId });
          setShowResult(true);
          setSpinning(false);
          fetch("/api/cases/inventory").then(r => r.json()).then(d => { if (Array.isArray(d)) setStash(d); });
          fetch("/api/cases/recent").then(r => r.json()).then(d => { if (Array.isArray(d)) setRecent(d); });
        }, SPIN_MS + 600);
      });
    });
  }

  async function sellItem(userItemId: string, sellValue: number) {
    const res = await fetch(`/api/cases/inventory/sell/${userItemId}`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setBalance(data.newBalance);
    setSellMsg(`Sold for ${sellValue.toLocaleString()} ₱`);
    setResult(null);
    setShowStrip(false);
    fetch("/api/cases/inventory").then(r => r.json()).then(d => { if (Array.isArray(d)) setStash(d); });
  }

  async function sellStashItem(id: string, sellValue: number) {
    const res = await fetch(`/api/cases/inventory/sell/${id}`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setBalance(data.newBalance);
    setStash(prev => prev?.filter(i => i.id !== id) ?? []);
  }

  function loadTab(t: "open" | "stash" | "recent") {
    setTab(t);
    if (t === "stash") fetch("/api/cases/inventory").then(r => r.json()).then(d => { if (Array.isArray(d)) setStash(d); });
    if (t === "recent") fetch("/api/cases/recent").then(r => r.json()).then(d => { if (Array.isArray(d)) setRecent(d); });
  }

  const canOpen = balance !== null && balance >= CASE_COST && !spinning;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-end justify-between">
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

      {/* Tabs */}
      <div className="border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {(["open", "stash", "recent"] as const).map(t => (
            <button
              key={t}
              onClick={() => loadTab(t)}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
                tab === t ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "open" ? "Open Case" : t === "stash" ? "My Stash" : "Recent Drops"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── OPEN TAB ── */}
        {tab === "open" && (
          <div className="space-y-8">

            {/* Case box */}
            <div className="flex flex-col items-center gap-6">
              <div
                className="relative w-56 h-56 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 overflow-hidden transition-all duration-500"
                style={{
                  borderColor: spinning ? "#f97316" : "#374151",
                  boxShadow: spinning ? "0 0 60px #f9731666, 0 0 120px #f9731622" : "none",
                  background: "linear-gradient(135deg, #0d0d15 0%, #1a1a2e 100%)",
                }}
              >
                {/* Case label stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />
                <div className="text-6xl select-none">{spinning ? "🎰" : "📦"}</div>
                <div className="text-xs font-black text-orange-500 uppercase tracking-widest">Psyko Case</div>
                <div className="text-xs text-gray-600">{CASE_COST} ₱ to open</div>
                {spinning && (
                  <div className="absolute inset-0 bg-orange-500/5 animate-pulse" />
                )}
              </div>

              {/* Rarity odds pills */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: "Mil-Spec",     color: "#4b69ff", pct: "79.9%" },
                  { label: "Restricted",   color: "#8847ff", pct: "15.9%" },
                  { label: "Classified",   color: "#d32ce6", pct: "3.2%"  },
                  { label: "Covert",       color: "#eb4b4b", pct: "0.64%" },
                  { label: "Rare Special", color: "#ffd700", pct: "0.26%" },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/50 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                    <span className="text-gray-400">{r.label}</span>
                    <span className="text-gray-600">{r.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Roulette strip */}
            {showStrip && (
              <div className="relative select-none" ref={containerRef}>
                {/* top/bottom tick arrows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-orange-500 z-20" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[12px] border-l-transparent border-r-transparent border-b-orange-500 z-20" />
                {/* center line */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-0.5 bg-orange-500 z-10 pointer-events-none" />

                <div
                  className="overflow-hidden rounded-xl border border-gray-800 bg-[#050508]"
                  style={{ height: 160 }}
                >
                  <div
                    ref={stripRef}
                    className="flex gap-3 px-4 py-3 will-change-transform"
                    style={{ width: `${STRIP_LEN * ITEM_W}px` }}
                  >
                    {strip.map((item, i) => (
                      <div
                        key={i}
                        className="shrink-0 rounded-xl flex flex-col items-center justify-center gap-1 p-2"
                        style={{
                          width: 120,
                          height: 134,
                          background: i === LAND_IDX ? `${item.color}22` : `${item.color}0d`,
                          borderWidth: 2,
                          borderStyle: "solid",
                          borderColor: i === LAND_IDX ? item.color : `${item.color}44`,
                          boxShadow: i === LAND_IDX ? rarityGlow(item.color) : "none",
                        }}
                      >
                        {imageMap[item.id] ? (
                          <img
                            src={imageMap[item.id]!}
                            alt={item.name}
                            width={90}
                            height={68}
                            className="object-contain"
                          />
                        ) : (
                          <span className="text-3xl">{item.emoji}</span>
                        )}
                        <span
                          className="text-center leading-tight font-medium"
                          style={{ fontSize: 8, color: item.color, maxWidth: 108 }}
                        >
                          {item.name.split(" | ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Result card */}
            {showResult && result && (
              <div
                className="rounded-2xl border-2 p-6 flex flex-col sm:flex-row items-center gap-6"
                style={{
                  borderColor: result.item.color,
                  background: `${result.item.color}12`,
                  boxShadow: rarityGlow(result.item.color),
                }}
              >
                <div
                  className="w-36 h-28 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${result.item.color}18` }}
                >
                  <ItemImage item={result.item} imageMap={imageMap} size={120} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: result.item.color }}>
                    {RARITY_LABEL[result.item.rarity]}
                  </p>
                  <p className="text-2xl font-black text-white leading-tight">{result.item.name}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Sell value: <span className="text-yellow-400 font-bold">{result.item.sellValue.toLocaleString()} ₱</span>
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
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

            {sellMsg && <p className="text-center text-yellow-400 font-bold">{sellMsg}</p>}

            {/* Open button */}
            <div className="flex justify-center">
              {balance === null ? (
                <p className="text-gray-500 text-sm">Sign in to open cases</p>
              ) : (
                <button
                  onClick={openCase}
                  disabled={!canOpen}
                  className={`px-12 py-4 text-lg font-black rounded-2xl transition-all uppercase tracking-wider ${
                    canOpen
                      ? "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30 hover:scale-105"
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {CASE_ITEMS.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border p-3 flex flex-col items-center gap-2 text-center"
                      style={{ borderColor: `${item.color}33`, background: `${item.color}0d` }}
                    >
                      {imageMap[item.id] ? (
                        <img
                          src={imageMap[item.id]!}
                          alt={item.name}
                          width={100}
                          height={75}
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-3xl">{item.emoji}</span>
                      )}
                      <div className="min-w-0 w-full">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: item.color }}>
                          {RARITY_LABEL[item.rarity]}
                        </p>
                        <p className="text-xs text-gray-300 font-medium truncate mt-0.5">{item.name}</p>
                        <p className="text-xs text-yellow-500 mt-0.5">{item.sellValue.toLocaleString()} ₱</p>
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
                <button onClick={() => setTab("open")} className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors">
                  Open a Case
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-4">{stash.length} item{stash.length !== 1 ? "s" : ""} in your stash</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stash.map(ui => (
                    <div
                      key={ui.id}
                      className="rounded-xl border p-4 flex items-center gap-4"
                      style={{ borderColor: `${ui.item.color}44`, background: `${ui.item.color}0d` }}
                    >
                      <div className="w-20 h-16 flex items-center justify-center shrink-0">
                        {imageMap[ui.item.id] ? (
                          <img src={imageMap[ui.item.id]!} alt={ui.item.name} width={80} height={60} className="object-contain" />
                        ) : (
                          <span className="text-3xl">{ui.item.emoji}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: ui.item.color }}>
                          {RARITY_LABEL[ui.item.rarity]}
                        </p>
                        <p className="text-sm font-bold text-white truncate">{ui.item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(ui.obtainedAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => sellStashItem(ui.id, ui.item.sellValue)}
                        className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors text-center"
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
                {recent.map(drop => (
                  <div
                    key={drop.id}
                    className="flex items-center gap-4 rounded-xl border p-3"
                    style={{ borderColor: `${drop.item.color}33`, background: `${drop.item.color}08` }}
                  >
                    <Image src={drop.avatar} alt={drop.username} width={36} height={36} className="rounded-full border border-gray-700 shrink-0" />
                    <div className="w-14 h-10 shrink-0 flex items-center justify-center">
                      {imageMap[drop.item.id] ? (
                        <img src={imageMap[drop.item.id]!} alt={drop.item.name} width={56} height={42} className="object-contain" />
                      ) : (
                        <span className="text-xl">{drop.item.emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-bold truncate">
                        <span className="text-orange-400">{drop.username}</span>{" "}
                        unboxed{" "}
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
