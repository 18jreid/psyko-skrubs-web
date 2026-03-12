"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { RARITY_LABEL, CASE_ITEMS, CASE_COST, CASE_DROP_PROFILES, getItemsForCase, weightedRandom, weightedRandomForCase, toUSD, type CaseItemDef } from "@/lib/caseItems";

// Legacy items are the first 16 entries (ms_1 … rs_2) — used by direct open tab
const LEGACY_ITEMS = CASE_ITEMS.filter(i => !i.caseId);

const ITEM_W = 140;
const ITEM_GAP = 4;
const STRIP_LEN = 80;
const LAND_IDX = 68;
const SPIN_MS = 7000;

function buildStrip(winner: CaseItemDef, caseTypeId?: string): { strip: CaseItemDef[]; offset: number } {
  const strip: CaseItemDef[] = [];
  const filler = caseTypeId
    ? () => weightedRandomForCase(caseTypeId)
    : () => weightedRandom();
  for (let i = 0; i < STRIP_LEN; i++) {
    strip.push(i === LAND_IDX ? winner : filler());
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
  float: number | null;
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
  const [caseImageMap, setCaseImageMap] = useState<Record<string, string | null>>({});

  // Open tab
  const [spinning, setSpinning] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [strip, setStrip] = useState<CaseItemDef[]>([]);
  const [showStrip, setShowStrip] = useState(false);
  const [result, setResult] = useState<{ item: CaseItemDef; userItemId: string; float: number | null } | null>(null);
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
    fetch("/api/cases/case-images").then(r => r.json()).then(d => setCaseImageMap(d)).catch(() => {});
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

    let data: { item: CaseItemDef; userItemId: string; float: number | null; newBalance: number } | null = null;
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
    animateSpin(data!.item, data!.userItemId, undefined, data!.float);
  }

  // ── Open owned case ──
  async function openOwnedCase(userCaseId: string, caseTypeId: string) {
    if (openingCaseId) return;
    setOpeningCaseId(userCaseId);

    let data: { item: CaseItemDef; userItemId: string; float: number | null } | null = null;
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
    animateSpin(data!.item, data!.userItemId, caseTypeId, data!.float ?? null);
  }

  function animateSpin(item: CaseItemDef, userItemId: string, caseTypeId?: string, float?: number | null) {
    const { strip: newStrip, offset: landOffset } = buildStrip(item, caseTypeId);
    setStrip(newStrip);
    setShowStrip(true);
    setRevealing(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = stripRef.current;
        const cw = containerRef.current?.offsetWidth ?? 800;
        if (!el) return;

        const startX = cw / 2 - ITEM_W / 2;
        const endX = -(LAND_IDX * (ITEM_W + ITEM_GAP)) + cw / 2 - ITEM_W / 2 + landOffset;

        el.style.transition = "none";
        el.style.transform = `translateX(${startX}px)`;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.05, 0, 0.0, 1)`;
            el.style.transform = `translateX(${endX}px)`;
          });
        });

        // Spin ends — brief reveal pause before showing result
        setTimeout(() => {
          setSpinning(false);
          setRevealing(true);
          setTimeout(() => {
            setRevealing(false);
            setResult({ item, userItemId, float: float ?? null });
            setShowResult(true);
            fetch("/api/cases/inventory").then(r => r.json()).then(d => { if (Array.isArray(d)) setStash(d); });
            fetch("/api/cases/recent").then(r => r.json()).then(d => { if (Array.isArray(d)) setRecent(d); });
          }, 1200);
        }, SPIN_MS + 200);
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
    setRevealing(false);
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

  const canOpen = balance !== null && balance >= CASE_COST && !spinning && !revealing;
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
            <div className="flex flex-col items-end px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-black text-xl">{balance.toLocaleString()}</span>
                <span className="text-yellow-500 text-sm font-bold">₱</span>
              </div>
              <span className="text-gray-500 text-xs font-mono">≈ {toUSD(balance)}</span>
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
                {/* CS2-style gold triangle markers */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 z-20"
                  style={{ borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "14px solid #f59e0b" }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 z-20"
                  style={{ borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderBottom: "14px solid #f59e0b" }} />
                {/* Center line */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-px z-10 pointer-events-none"
                  style={{ background: revealing ? strip[LAND_IDX]?.color ?? "#f59e0b" : "#f59e0b", opacity: revealing ? 1 : 0.7,
                    boxShadow: revealing ? `0 0 12px ${strip[LAND_IDX]?.color ?? "#f59e0b"}` : "none",
                    transition: "box-shadow 0.3s, background 0.3s" }} />
                {/* Edge fade vignette */}
                <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none rounded-l-xl"
                  style={{ background: "linear-gradient(to right, #050508 0%, transparent 100%)" }} />
                <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none rounded-r-xl"
                  style={{ background: "linear-gradient(to left, #050508 0%, transparent 100%)" }} />
                <div className="overflow-hidden rounded-xl border border-gray-800/80 bg-[#050508]" style={{ height: 168 }}>
                  <div ref={stripRef} className="flex py-3 will-change-transform"
                    style={{ width: `${STRIP_LEN * (ITEM_W + ITEM_GAP)}px`, gap: ITEM_GAP, paddingLeft: 8, paddingRight: 8 }}>
                    {strip.map((item, i) => {
                      const isWinner = i === LAND_IDX;
                      return (
                        <div key={i} className="shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg"
                          style={{
                            width: ITEM_W,
                            height: 144,
                            background: `linear-gradient(180deg, ${item.color}28 0%, ${item.color}0a 100%)`,
                            borderTop: `2px solid ${item.color}`,
                            borderLeft: `1px solid ${item.color}40`,
                            borderRight: `1px solid ${item.color}40`,
                            borderBottom: `1px solid ${item.color}20`,
                            boxShadow: (revealing && isWinner) ? rarityGlow(item.color) : "none",
                            transition: "box-shadow 0.4s ease-out",
                          }}
                        >
                          {imageMap[item.id] ? (
                            <img src={imageMap[item.id]!} alt={item.name} width={96} height={72} className="object-contain" />
                          ) : (
                            <span className="text-3xl">{item.emoji}</span>
                          )}
                          <span className="text-center leading-tight font-bold truncate w-full text-center px-1"
                            style={{ fontSize: 9, color: item.color }}>
                            {item.name.split(" | ")[1]?.split(" (")[0] ?? item.name}
                          </span>
                        </div>
                      );
                    })}
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
                    <span className="text-gray-600 text-xs font-mono ml-2">≈ {toUSD(result.item.sellValue)}</span>
                  </p>
                  {result.float !== null && (
                    <p className="text-xs text-gray-600 mt-1 font-mono">
                      Float: <span className="text-gray-400">{result.float.toFixed(10)}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => sellItem(result.userItemId, result.item.sellValue)}
                    className="px-4 py-2 text-sm font-bold rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                    Sell ({result.item.sellValue.toLocaleString()} ₱)
                  </button>
                  <a href={`/stash/${result.userItemId}`}
                    className="px-4 py-2 text-sm font-bold rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                    Inspect
                  </a>
                  <button onClick={() => { setShowResult(false); setShowStrip(false); }}
                    className="px-4 py-2 text-sm font-bold rounded-xl bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors">
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
                  {LEGACY_ITEMS.map(item => (
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
              All cases use <span className="text-orange-400 font-bold">identical CS2 drop rates</span> —
              higher-priced cases contain more valuable items at every tier.
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {shopCases.map(ct => {
                  const profile = CASE_DROP_PROFILES[ct.id];
                  const tierEntries = profile ? Object.entries(profile.tiers) as [string, number][] : [];
                  const total = tierEntries.reduce((s, [, w]) => s + w, 0);
                  const casePool = getItemsForCase(ct.id);
                  const rarityColors: Record<string, string> = {
                    "mil-spec": "#4b69ff", "restricted": "#8847ff", "classified": "#d32ce6",
                    "covert": "#eb4b4b", "rare-special": "#ffd700",
                  };
                  const canAfford = balance === null || balance >= ct.price;

                  return (
                    <div key={ct.id}
                      className="rounded-2xl border flex flex-col overflow-hidden"
                      style={{ borderColor: canAfford ? "#f9731633" : "#37415133", background: "#0d0d15" }}
                    >
                      {/* Header stripe — color gradient based on highest tier */}
                      {tierEntries.length > 0 && (
                        <div className="h-1 w-full" style={{
                          background: `linear-gradient(to right, ${
                            tierEntries.map(([t]) => rarityColors[t] ?? "#f97316").join(", ")
                          })`,
                        }} />
                      )}

                      <div className="p-5 flex gap-4">
                        {/* Case image */}
                        <div className="w-20 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                          style={{ background: "#f9731610", border: "1px solid #f9731620" }}>
                          {caseImageMap[ct.id] ? (
                            <img src={caseImageMap[ct.id]!} alt={ct.name} width={80} height={64} className="object-contain" />
                          ) : (
                            <span className="text-4xl">{ct.imageEmoji}</span>
                          )}
                        </div>

                        {/* Name + description + price */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-black text-white leading-tight">{ct.name}</h3>
                          {ct.description && <p className="text-xs text-gray-500 mt-1">{ct.description}</p>}
                          <p className="text-2xl font-black text-yellow-400 mt-2">{ct.price.toLocaleString()} <span className="text-base">₱</span></p>
                          <p className="text-xs text-gray-600 font-mono">≈ {toUSD(ct.price)}</p>
                        </div>
                      </div>

                      {/* Drop rate bars */}
                      {tierEntries.length > 0 && (
                        <div className="px-5 pb-3 flex flex-wrap gap-2">
                          {tierEntries.map(([tier, w]) => (
                            <div key={tier} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                              style={{ background: `${rarityColors[tier]}15`, border: `1px solid ${rarityColors[tier]}30` }}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: rarityColors[tier] }} />
                              <span className="font-bold" style={{ color: rarityColors[tier] }}>{RARITY_LABEL[tier]}</span>
                              <span className="text-gray-500">{((w / total) * 100).toFixed(2)}%</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Item pool preview (collapsed, up to 8 items) */}
                      <div className="px-5 pb-4">
                        <p className="text-xs text-gray-700 uppercase tracking-wider font-bold mb-2">Contains {casePool.length} skins</p>
                        <div className="flex flex-wrap gap-1">
                          {casePool.slice(0, 8).map(item => (
                            <div key={item.id} className="px-2 py-0.5 rounded text-xs font-medium truncate max-w-[140px]"
                              style={{ background: `${item.color}15`, color: item.color, border: `1px solid ${item.color}25` }}>
                              {item.name.split(" | ")[1]?.split(" (")[0] ?? item.name}
                            </div>
                          ))}
                          {casePool.length > 8 && (
                            <div className="px-2 py-0.5 rounded text-xs font-medium text-gray-600 bg-gray-800/50">
                              +{casePool.length - 8} more
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Buy button */}
                      <div className="px-5 pb-5 mt-auto">
                        <button
                          onClick={() => buyCase(ct)}
                          disabled={buyingCaseId === ct.id || !canAfford}
                          className={`w-full py-3 text-sm font-black rounded-xl transition-all ${
                            !canAfford
                              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                              : buyingCaseId === ct.id
                              ? "bg-orange-500/50 text-white cursor-wait"
                              : "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 hover:scale-[1.02]"
                          }`}
                        >
                          {buyingCaseId === ct.id ? "Buying…" : !canAfford ? `Need ${(ct.price - (balance ?? 0)).toLocaleString()} ₱ more` : `Buy for ${ct.price.toLocaleString()} ₱`}
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                  {myCases.map(uc => {
                    const profile = CASE_DROP_PROFILES[uc.caseType.id];
                    const tiers = profile ? Object.keys(profile.tiers) : [];
                    const tierColors: Record<string, string> = {
                      "mil-spec": "#4b69ff", "restricted": "#8847ff", "classified": "#d32ce6",
                      "covert": "#eb4b4b", "rare-special": "#ffd700",
                    };
                    const floorTier = tiers[0];
                    const topTier = tiers[tiers.length - 1];
                    const accent = tierColors[topTier] ?? "#f97316";
                    return (
                    <div key={uc.id} className="rounded-xl border p-4 flex items-center gap-4"
                      style={{ borderColor: `${accent}33`, background: `${accent}08` }}>
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                        {caseImageMap[uc.caseType.id] ? (
                          <img src={caseImageMap[uc.caseType.id]!} alt={uc.caseType.name} width={56} height={56} className="object-contain" />
                        ) : (
                          <span className="text-3xl">{uc.caseType.imageEmoji}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white">{uc.caseType.name}</p>
                        {floorTier && (
                          <p className="text-xs font-bold mt-0.5" style={{ color: tierColors[floorTier] }}>
                            {RARITY_LABEL[floorTier]}+ drops
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-0.5">{new Date(uc.obtainedAt).toLocaleDateString()}</p>
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
                              onClick={() => openOwnedCase(uc.id, uc.caseType.id)}
                              disabled={openingCaseId === uc.id}
                              className="px-3 py-1.5 text-xs font-black rounded-lg text-white transition-colors disabled:opacity-50"
                              style={{ background: accent }}
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
                    );
                  })}
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
                        {ui.float !== null && (
                          <p className="text-xs font-mono text-gray-600 mt-0.5">{ui.float.toFixed(6)}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <a href={`/stash/${ui.id}`}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors text-center">
                          Inspect
                        </a>
                        <button onClick={() => sellStashItem(ui.id, ui.item.sellValue)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors text-center">
                          Sell {ui.item.sellValue.toLocaleString()} ₱
                          <span className="block text-gray-600 font-mono font-normal" style={{ fontSize: "10px" }}>≈ {toUSD(ui.item.sellValue)}</span>
                        </button>
                      </div>
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
              <div className="w-12 h-12 flex items-center justify-center">
                {caseImageMap[listingCase.caseType.id] ? (
                  <img src={caseImageMap[listingCase.caseType.id]!} alt={listingCase.caseType.name} width={48} height={48} className="object-contain" />
                ) : (
                  <span className="text-4xl">{listingCase.caseType.imageEmoji}</span>
                )}
              </div>
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
