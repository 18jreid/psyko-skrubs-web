"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { RARITY_LABEL, CASE_ITEMS, CASE_COST, weightedRandom, type CaseItemDef } from "@/lib/caseItems";

const ITEM_W = 132;
const STRIP_LEN = 80;
const LAND_IDX = 68;
const SPIN_MS = 6000;

function buildStrip(winner: CaseItemDef): { strip: CaseItemDef[]; offset: number } {
  const strip: CaseItemDef[] = [];
  for (let i = 0; i < STRIP_LEN; i++) {
    strip.push(i === LAND_IDX ? winner : weightedRandom());
  }
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

interface CaseTypeDef {
  id: string;
  name: string;
  description: string | null;
  imageEmoji: string;
  price: number;
}

interface UserCaseEntry {
  id: string;
  obtainedAt: string;
  listed: boolean;
  caseType: CaseTypeDef;
}

function ItemImage({ item, imageMap, size = 80 }: { item: CaseItemDef; imageMap: Record<string, string | null>; size?: number }) {
  const src = imageMap[item.id];
  if (src) {
    return (
      <img src={src} alt={item.name} width={size} height={Math.round(size * 0.75)}
        className="object-contain drop-shadow-lg" style={{ imageRendering: "auto" }} />
    );
  }
  return <span className="text-4xl">{item.emoji}</span>;
}

export default function CasesPage() {
  const [tab, setTab] = useState<"open" | "shop" | "mycases" | "stash" | "recent">("open");
  const [balance, setBalance] = useState<number | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({});

  // Open tab
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<CaseItemDef[]>([]);
  const [showStrip, setShowStrip] = useState(false);
  const [result, setResult] = useState<{ item: CaseItemDef; userItemId: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sellMsg, setSellMsg] = useState<string | null>(null);

  // Shop tab
  const [shopCases, setShopCases] = useState<CaseTypeDef[] | null>(null);
  const [buyingCaseId, setBuyingCaseId] = useState<string | null>(null);
  const [buyMsg, setBuyMsg] = useState<string | null>(null);

  // My Cases tab
  const [myCases, setMyCases] = useState<UserCaseEntry[] | null>(null);
  const [openingCaseId, setOpeningCaseId] = useState<string | null>(null);
  const [listingCase, setListingCase] = useState<UserCaseEntry | null>(null);
  const [listCasePrice, setListCasePrice] = useState("");
  const [listCaseInProgress, setListCaseInProgress] = useState(false);

  // Stash tab
  const [stash, setStash] = useState<UserItemEntry[] | null>(null);

  // Recent tab
  const [recent, setRecent] = useState<RecentDrop[] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/cases/balance").then(r => r.json()).then(d => { if (d.balance !== null) setBalance(d.balance); });
    fetch("/api/cases/items").then(r => r.json()).then(d => setImageMap(d)).catch(() => {});
    fetch("/api/cases/inventory").then(r => r.json()).then(d => { if (Array.isArray(d)) setStash(d); });
    fetch("/api/cases/recent").then(r => r.json()).then(d => { if (Array.isArray(d)) setRecent(d); });
    fetch("/api/cases/shop").then(r => r.json()).then(d => { if (Array.isArray(d)) setShopCases(d); });
    fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCases(d); });
  }, []);

  // ── Direct open (legacy) ──
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
    animateSpin(data!.item, data!.userItemId);
  }

  // ── Open owned case ──
  async function openOwnedCase(userCaseId: string) {
    if (openingCaseId) return;
    setOpeningCaseId(userCaseId);

    let data: { item: CaseItemDef; userItemId: string } | null = null;
    try {
      const res = await fetch(`/api/cases/open-owned/${userCaseId}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Failed to open case");
        setOpeningCaseId(null);
        return;
      }
      data = await res.json();
    } catch {
      setOpeningCaseId(null);
      return;
    }

    setOpeningCaseId(null);
    // Refresh my cases
    fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCases(d); });
    // Switch to open tab to show animation
    setTab("open");
    setSpinning(true);
    setShowResult(false);
    setResult(null);
    setSellMsg(null);
    animateSpin(data!.item, data!.userItemId);
  }

  function animateSpin(item: CaseItemDef, userItemId: string) {
    const { strip: newStrip, offset: landOffset } = buildStrip(item);
    setStrip(newStrip);
    setShowStrip(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = stripRef.current;
        const cw = containerRef.current?.offsetWidth ?? 800;
        if (!el) return;

        const startX = cw / 2 - ITEM_W / 2;
        const endX = -(LAND_IDX * ITEM_W) + cw / 2 - ITEM_W / 2 + landOffset;

        el.style.transition = "none";
        el.style.transform = `translateX(${startX}px)`;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.07, 0, 0.0, 1)`;
            el.style.transform = `translateX(${endX}px)`;
          });
        });

        setTimeout(() => {
          setResult({ item, userItemId });
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

  async function buyCase(caseType: CaseTypeDef) {
    setBuyingCaseId(caseType.id);
    setBuyMsg(null);
    const res = await fetch(`/api/cases/shop/buy/${caseType.id}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Purchase failed");
    } else {
      const d = await res.json();
      setBalance(d.newBalance);
      setBuyMsg(`Purchased ${caseType.name}! Check My Cases.`);
      fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCases(d); });
    }
    setBuyingCaseId(null);
  }

  async function listCaseOnMarket() {
    if (!listingCase) return;
    const price = parseInt(listCasePrice);
    if (!price || price < 1) return;
    setListCaseInProgress(true);
    const res = await fetch("/api/market/case-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userCaseId: listingCase.id, price }),
    });
    setListCaseInProgress(false);
    if (!res.ok) { const e = await res.json(); alert(e.error ?? "Failed"); return; }
    setListingCase(null);
    setListCasePrice("");
    fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCases(d); });
  }

  function loadTab(t: typeof tab) {
    setTab(t);
    if (t === "stash") fetch("/api/cases/inventory").then(r => r.json()).then(d => { if (Array.isArray(d)) setStash(d); });
    if (t === "recent") fetch("/api/cases/recent").then(r => r.json()).then(d => { if (Array.isArray(d)) setRecent(d); });
    if (t === "shop") fetch("/api/cases/shop").then(r => r.json()).then(d => { if (Array.isArray(d)) setShopCases(d); });
    if (t === "mycases") fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCases(d); });
  }

  const canOpen = balance !== null && balance >= CASE_COST && !spinning;
  const TABS = [
    { key: "open",    label: "Open Case" },
    { key: "shop",    label: "Case Shop" },
    { key: "mycases", label: "My Cases" },
    { key: "stash",   label: "My Stash" },
    { key: "recent",  label: "Recent Drops" },
  ] as const;

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => loadTab(key)}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
                tab === key ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
              {key === "mycases" && myCases && myCases.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">{myCases.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── OPEN TAB ── */}
        {tab === "open" && (
          <div className="space-y-8">
            <div className="flex flex-col items-center gap-6">
              <div
                className="relative w-56 h-56 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 overflow-hidden transition-all duration-500"
                style={{
                  borderColor: spinning ? "#f97316" : "#374151",
                  boxShadow: spinning ? "0 0 60px #f9731666, 0 0 120px #f9731622" : "none",
                  background: "linear-gradient(135deg, #0d0d15 0%, #1a1a2e 100%)",
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />
                <div className="text-6xl select-none">{spinning ? "🎰" : "📦"}</div>
                <div className="text-xs font-black text-orange-500 uppercase tracking-widest">Psyko Case</div>
                <div className="text-xs text-gray-600">{CASE_COST} ₱ to open</div>
                {spinning && <div className="absolute inset-0 bg-orange-500/5 animate-pulse" />}
              </div>

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

            {showStrip && (
              <div className="relative select-none" ref={containerRef}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-orange-500 z-20" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[12px] border-l-transparent border-r-transparent border-b-orange-500 z-20" />
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-0.5 bg-orange-500 z-10 pointer-events-none" />
                <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#050508]" style={{ height: 160 }}>
                  <div ref={stripRef} className="flex gap-3 px-4 py-3 will-change-transform" style={{ width: `${STRIP_LEN * ITEM_W}px` }}>
                    {strip.map((item, i) => (
                      <div key={i} className="shrink-0 rounded-xl flex flex-col items-center justify-center gap-1 p-2"
                        style={{
                          width: 120, height: 134,
                          background: i === LAND_IDX ? `${item.color}22` : `${item.color}0d`,
                          borderWidth: 2, borderStyle: "solid",
                          borderColor: i === LAND_IDX ? item.color : `${item.color}44`,
                          boxShadow: i === LAND_IDX ? rarityGlow(item.color) : "none",
                        }}
                      >
                        {imageMap[item.id] ? (
                          <img src={imageMap[item.id]!} alt={item.name} width={90} height={68} className="object-contain" />
                        ) : (
                          <span className="text-3xl">{item.emoji}</span>
                        )}
                        <span className="text-center leading-tight font-medium" style={{ fontSize: 8, color: item.color, maxWidth: 108 }}>
                          {item.name.split(" | ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showResult && result && (
              <div className="rounded-2xl border-2 p-6 flex flex-col sm:flex-row items-center gap-6"
                style={{ borderColor: result.item.color, background: `${result.item.color}12`, boxShadow: rarityGlow(result.item.color) }}
              >
                <div className="w-36 h-28 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${result.item.color}18` }}>
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
                  <button onClick={() => sellItem(result.userItemId, result.item.sellValue)}
                    className="px-4 py-2 text-sm font-bold rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                    Sell ({result.item.sellValue.toLocaleString()} ₱)
                  </button>
                  <button onClick={() => { setShowResult(false); setShowStrip(false); }}
                    className="px-4 py-2 text-sm font-bold rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                    Keep
                  </button>
                </div>
              </div>
            )}

            {sellMsg && <p className="text-center text-yellow-400 font-bold">{sellMsg}</p>}

            <div className="flex justify-center">
              {balance === null ? (
                <p className="text-gray-500 text-sm">Sign in to open cases</p>
              ) : (
                <button onClick={openCase} disabled={!canOpen}
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

            {!showStrip && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-3">Items in this case</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {CASE_ITEMS.map(item => (
                    <div key={item.id} className="rounded-xl border p-3 flex flex-col items-center gap-2 text-center"
                      style={{ borderColor: `${item.color}33`, background: `${item.color}0d` }}>
                      {imageMap[item.id] ? (
                        <img src={imageMap[item.id]!} alt={item.name} width={100} height={75} className="object-contain" />
                      ) : (
                        <span className="text-3xl">{item.emoji}</span>
                      )}
                      <div className="min-w-0 w-full">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: item.color }}>{RARITY_LABEL[item.rarity]}</p>
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

        {/* ── CASE SHOP TAB ── */}
        {tab === "shop" && (
          <div>
            <p className="text-sm text-gray-500 mb-6">
              Buy cases to open from your inventory — or sell them on the{" "}
              <a href="/market" className="text-orange-400 hover:underline">marketplace</a>.
            </p>
            {buyMsg && (
              <div className="mb-6 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 font-bold text-sm">
                {buyMsg}
              </div>
            )}
            {shopCases === null ? (
              <p className="text-gray-500 text-center py-12">Loading…</p>
            ) : shopCases.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No cases available in the shop right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopCases.map(ct => (
                  <div key={ct.id} className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-4xl shrink-0">
                        {ct.imageEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-white">{ct.name}</h3>
                        {ct.description && <p className="text-xs text-gray-500 mt-0.5">{ct.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-black text-yellow-400">{ct.price.toLocaleString()} ₱</p>
                        <p className="text-xs text-gray-600">per case</p>
                      </div>
                      <button
                        onClick={() => buyCase(ct)}
                        disabled={buyingCaseId === ct.id || (balance !== null && balance < ct.price)}
                        className={`px-6 py-2.5 text-sm font-black rounded-xl transition-all ${
                          balance !== null && balance < ct.price
                            ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                            : buyingCaseId === ct.id
                            ? "bg-orange-500/50 text-white cursor-wait"
                            : "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 hover:scale-105"
                        }`}
                      >
                        {buyingCaseId === ct.id ? "Buying…" : "Buy Case"}
                      </button>
                    </div>
                    {balance !== null && balance < ct.price && (
                      <p className="text-xs text-red-400 font-bold">Insufficient balance</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY CASES TAB ── */}
        {tab === "mycases" && (
          <div>
            {myCases === null ? (
              <p className="text-gray-500 text-center py-12">Loading…</p>
            ) : myCases.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-gray-400 font-bold text-lg">No cases in your inventory</p>
                <p className="text-gray-600 text-sm mt-2">Buy cases from the shop or the marketplace</p>
                <div className="flex gap-3 justify-center mt-6">
                  <button onClick={() => loadTab("shop")}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors">
                    Case Shop
                  </button>
                  <a href="/market"
                    className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm transition-colors">
                    Marketplace
                  </a>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-4">{myCases.length} case{myCases.length !== 1 ? "s" : ""} in your inventory</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {myCases.map(uc => (
                    <div key={uc.id}
                      className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-3xl shrink-0">
                        {uc.caseType.imageEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white">{uc.caseType.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(uc.obtainedAt).toLocaleDateString()}</p>
                        {uc.listed && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Listed on market
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {uc.listed ? (
                          <a href="/market"
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors text-center">
                            View
                          </a>
                        ) : (
                          <>
                            <button
                              onClick={() => openOwnedCase(uc.id)}
                              disabled={openingCaseId === uc.id}
                              className="px-3 py-1.5 text-xs font-black rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50"
                            >
                              {openingCaseId === uc.id ? "Opening…" : "Open"}
                            </button>
                            <button
                              onClick={() => { setListingCase(uc); setListCasePrice(String(uc.caseType.price)); }}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
                            >
                              Sell
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
                <button onClick={() => setTab("open")}
                  className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors">
                  Open a Case
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-4">{stash.length} item{stash.length !== 1 ? "s" : ""} in your stash</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stash.map(ui => (
                    <div key={ui.id} className="rounded-xl border p-4 flex items-center gap-4"
                      style={{ borderColor: `${ui.item.color}44`, background: `${ui.item.color}0d` }}>
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
                      <button onClick={() => sellStashItem(ui.id, ui.item.sellValue)}
                        className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors text-center">
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
                  <div key={drop.id} className="flex items-center gap-4 rounded-xl border p-3"
                    style={{ borderColor: `${drop.item.color}33`, background: `${drop.item.color}08` }}>
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

      {/* ── LIST CASE ON MARKET MODAL ── */}
      {listingCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setListingCase(null)}>
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white mb-4">List Case on Market</h3>
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="text-4xl">{listingCase.caseType.imageEmoji}</div>
              <div>
                <p className="text-sm font-black text-white">{listingCase.caseType.name}</p>
                <p className="text-xs text-gray-500">Shop price: {listingCase.caseType.price.toLocaleString()} ₱</p>
              </div>
            </div>
            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Your Price (₱)</label>
            <input
              type="number" min={1} value={listCasePrice} onChange={e => setListCasePrice(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-xl px-4 py-3 text-white text-xl font-black focus:outline-none focus:border-orange-500/60 mb-2"
              placeholder="Enter price"
            />
            {listCasePrice && parseInt(listCasePrice) > 0 && (
              <p className="text-xs text-gray-600 mb-4">
                You receive: <span className="text-yellow-400 font-bold">{Math.floor(parseInt(listCasePrice) * 0.95).toLocaleString()} ₱</span>
                <span className="text-gray-700"> (after 5% fee)</span>
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setListingCase(null)}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={listCaseOnMarket}
                disabled={listCaseInProgress || !listCasePrice || parseInt(listCasePrice) < 1}
                className="flex-1 py-2.5 text-sm font-black rounded-xl bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
                {listCaseInProgress ? "Listing…" : "List Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
