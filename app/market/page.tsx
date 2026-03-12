"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { CASE_ITEMS, RARITY_LABEL, toUSD, type CaseItemDef } from "@/lib/caseItems";

const MARKET_FEE = 0.05;

interface Listing {
  id: string;
  price: number;
  createdAt: string;
  isMine: boolean;
  seller: { id: string; username: string; avatar: string };
  item: CaseItemDef;
}

interface MyListing {
  id: string;
  price: number;
  status: string;
  createdAt: string;
  soldAt: string | null;
  buyer: { username: string; avatar: string } | null;
  item: CaseItemDef;
}

interface HistorySale {
  id: string;
  price: number;
  soldAt: string | null;
  seller: { username: string; avatar: string };
  buyer: { username: string; avatar: string } | null;
  item: CaseItemDef;
}

interface StashItem {
  id: string;
  obtainedAt: string;
  item: CaseItemDef;
  listed?: boolean;
}

interface CaseTypeDef {
  id: string;
  name: string;
  description: string | null;
  imageEmoji: string;
  price: number;
}

interface CaseListing {
  id: string;
  price: number;
  createdAt: string;
  isMine: boolean;
  seller: { id: string; username: string; avatar: string };
  caseType: CaseTypeDef;
}

interface MyCaseListing {
  id: string;
  price: number;
  status: string;
  createdAt: string;
  soldAt: string | null;
  buyer: { username: string; avatar: string } | null;
  caseType: CaseTypeDef;
}

interface UserCaseEntry {
  id: string;
  obtainedAt: string;
  listed: boolean;
  caseType: CaseTypeDef;
}

const RARITIES = ["all", "mil-spec", "restricted", "classified", "covert", "rare-special"] as const;
const RARITY_COLORS: Record<string, string> = {
  "mil-spec": "#4b69ff", "restricted": "#8847ff", "classified": "#d32ce6",
  "covert": "#eb4b4b", "rare-special": "#ffd700",
};

function ItemImg({ item, imageMap, size = 80 }: { item: CaseItemDef; imageMap: Record<string, string | null>; size?: number }) {
  const src = imageMap[item.id];
  if (src) return <img src={src} alt={item.name} width={size} height={Math.round(size * 0.75)} className="object-contain drop-shadow-lg" />;
  return <span style={{ fontSize: size * 0.4 }}>{item.emoji}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    active:    { label: "Active",    cls: "bg-green-500/20 text-green-400 border-green-500/30" },
    sold:      { label: "Sold",      cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    cancelled: { label: "Cancelled", cls: "bg-gray-700 text-gray-500 border-gray-600" },
  };
  const { label, cls } = cfg[status] ?? cfg.cancelled;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>{label}</span>;
}

type MainTab = "browse" | "sell" | "my" | "history" | "cases";

export default function MarketPage() {
  const [tab, setTab] = useState<MainTab>("browse");
  const [balance, setBalance] = useState<number | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({});

  // Items browse
  const [listings, setListings] = useState<Listing[]>([]);
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [confirmListing, setConfirmListing] = useState<Listing | null>(null);

  // Items sell
  const [stash, setStash] = useState<StashItem[]>([]);
  const [listingItem, setListingItem] = useState<StashItem | null>(null);
  const [listPrice, setListPrice] = useState("");
  const [listingInProgress, setListingInProgress] = useState(false);

  // My item listings
  const [myListings, setMyListings] = useState<MyListing[]>([]);

  // Item history
  const [history, setHistory] = useState<HistorySale[]>([]);

  // Cases tab state
  const [caseSubTab, setCaseSubTab] = useState<"browse" | "sell" | "my">("browse");
  const [caseListings, setCaseListings] = useState<CaseListing[]>([]);
  const [caseSort, setCaseSort] = useState("newest");
  const [buyingCaseId, setBuyingCaseId] = useState<string | null>(null);
  const [confirmCaseListing, setConfirmCaseListing] = useState<CaseListing | null>(null);
  const [myCaseInventory, setMyCaseInventory] = useState<UserCaseEntry[]>([]);
  const [listingCase, setListingCase] = useState<UserCaseEntry | null>(null);
  const [listCasePrice, setListCasePrice] = useState("");
  const [listCaseInProgress, setListCaseInProgress] = useState(false);
  const [myCaseListings, setMyCaseListings] = useState<MyCaseListing[]>([]);

  useEffect(() => {
    fetch("/api/cases/items").then(r => r.json()).then(setImageMap).catch(() => {});
    fetch("/api/cases/balance").then(r => r.json()).then(d => { if (d.balance !== null) setBalance(d.balance); });
  }, []);

  const fetchListings = useCallback(() => {
    const params = new URLSearchParams({ rarity: rarityFilter, sort, search });
    fetch(`/api/market/listings?${params}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setListings(d); });
  }, [rarityFilter, sort, search]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const fetchCaseListings = useCallback(() => {
    const params = new URLSearchParams({ sort: caseSort });
    fetch(`/api/market/case-listings?${params}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setCaseListings(d); });
  }, [caseSort]);

  function loadTab(t: MainTab) {
    setTab(t);
    if (t === "browse") fetchListings();
    if (t === "sell") {
      fetch("/api/cases/inventory").then(r => r.json()).then(async (items) => {
        if (!Array.isArray(items)) return;
        const myL = await fetch("/api/market/my-listings").then(r => r.json());
        const listedItemIds = new Set((myL as MyListing[]).filter(l => l.status === "active").map(l => l.item.id));
        setStash(items.map((i: StashItem) => ({ ...i, listed: listedItemIds.has(i.item.id) })));
      });
    }
    if (t === "my") fetch("/api/market/my-listings").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyListings(d); });
    if (t === "history") fetch("/api/market/history").then(r => r.json()).then(d => { if (Array.isArray(d)) setHistory(d); });
    if (t === "cases") {
      fetchCaseListings();
      fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCaseInventory(d); });
      fetch("/api/market/my-case-listings").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCaseListings(d); });
    }
  }

  function loadCaseSubTab(t: typeof caseSubTab) {
    setCaseSubTab(t);
    if (t === "browse") fetchCaseListings();
    if (t === "sell") fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCaseInventory(d); });
    if (t === "my") fetch("/api/market/my-case-listings").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCaseListings(d); });
  }

  async function buyListing(listing: Listing) {
    setBuyingId(listing.id);
    const res = await fetch(`/api/market/buy/${listing.id}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Purchase failed");
    } else {
      const d = await res.json();
      setBalance(d.newBalance);
      fetchListings();
    }
    setBuyingId(null);
    setConfirmListing(null);
  }

  async function cancelListing(id: string) {
    const res = await fetch(`/api/market/cancel/${id}`, { method: "POST" });
    if (res.ok) {
      setMyListings(prev => prev.map(l => l.id === id ? { ...l, status: "cancelled" } : l));
      fetchListings();
    }
  }

  async function listItem() {
    if (!listingItem) return;
    const price = parseInt(listPrice);
    if (!price || price < 1) return;
    setListingInProgress(true);
    const res = await fetch("/api/market/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userItemId: listingItem.id, price }),
    });
    setListingInProgress(false);
    if (!res.ok) { const e = await res.json(); alert(e.error ?? "Failed"); return; }
    setListingItem(null);
    setListPrice("");
    setStash(prev => prev.map(i => i.id === listingItem.id ? { ...i, listed: true } : i));
  }

  async function buyCaseListing(listing: CaseListing) {
    setBuyingCaseId(listing.id);
    const res = await fetch(`/api/market/case-buy/${listing.id}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Purchase failed");
    } else {
      const d = await res.json();
      setBalance(d.newBalance);
      fetchCaseListings();
      fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCaseInventory(d); });
    }
    setBuyingCaseId(null);
    setConfirmCaseListing(null);
  }

  async function cancelCaseListing(id: string) {
    const res = await fetch(`/api/market/case-cancel/${id}`, { method: "POST" });
    if (res.ok) {
      setMyCaseListings(prev => prev.map(l => l.id === id ? { ...l, status: "cancelled" } : l));
      fetchCaseListings();
    }
  }

  async function listCase() {
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
    fetch("/api/cases/my-cases").then(r => r.json()).then(d => { if (Array.isArray(d)) setMyCaseInventory(d); });
  }

  const sellerPayout = (p: number) => Math.floor(p * (1 - MARKET_FEE));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white">Psyko <span className="text-orange-500">Market</span></h1>
            <p className="text-gray-500 mt-1 text-sm">Buy and sell skins &amp; cases with Psyko Coins · 5% marketplace fee</p>
          </div>
          <div className="flex items-center gap-4">
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
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
          {([
            ["browse",  "Browse Skins"],
            ["sell",    "Sell Skins"],
            ["my",      "My Listings"],
            ["history", "Sales History"],
            ["cases",   "Cases"],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => loadTab(t)}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
                tab === t ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── BROWSE SKINS ── */}
        {tab === "browse" && (
          <div>
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
                  className="w-full bg-[#0a0a0f] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {RARITIES.map(r => (
                  <button key={r} onClick={() => setRarityFilter(r)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                      rarityFilter === r ? "text-white border-current" : "bg-gray-800/50 text-gray-500 border-gray-800 hover:text-gray-300"
                    }`}
                    style={rarityFilter === r && r !== "all"
                      ? { borderColor: RARITY_COLORS[r], color: RARITY_COLORS[r], background: `${RARITY_COLORS[r]}18` }
                      : rarityFilter === r ? { borderColor: "#f97316", color: "#f97316", background: "#f9731618" } : {}}
                  >{r === "all" ? "All" : RARITY_LABEL[r]}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-bold uppercase tracking-wider shrink-0">Sort:</span>
                {[["newest", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"], ["rarity", "Rarity"]].map(([v, label]) => (
                  <button key={v} onClick={() => setSort(v)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      sort === v ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                    }`}>{label}</button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4">{listings.length} listing{listings.length !== 1 ? "s" : ""}</p>
            {listings.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🏪</div>
                <p className="text-gray-400 font-bold text-lg">No listings yet</p>
                <p className="text-gray-600 text-sm mt-2">Be the first to list an item</p>
                <button onClick={() => loadTab("sell")} className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors">List an Item</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {listings.map(listing => (
                  <div key={listing.id} className="rounded-xl border flex flex-col overflow-hidden hover:border-opacity-60 transition-all group"
                    style={{ borderColor: `${RARITY_COLORS[listing.item.rarity] ?? "#374151"}44`, background: `${RARITY_COLORS[listing.item.rarity] ?? "#0d0d15"}0d` }}>
                    <div className="h-0.5 w-full" style={{ background: RARITY_COLORS[listing.item.rarity] ?? "#374151" }} />
                    <div className="flex items-center justify-center h-24 p-2" style={{ background: `${RARITY_COLORS[listing.item.rarity] ?? "#0d0d15"}12` }}>
                      <ItemImg item={listing.item} imageMap={imageMap} size={90} />
                    </div>
                    <div className="flex flex-col gap-1 p-2.5 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider leading-none" style={{ color: RARITY_COLORS[listing.item.rarity] }}>{RARITY_LABEL[listing.item.rarity]}</p>
                      <p className="text-xs text-white font-bold leading-tight line-clamp-2">{listing.item.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Image src={listing.seller.avatar} alt={listing.seller.username} width={14} height={14} className="rounded-full" />
                        <p className="text-xs text-gray-500 truncate">{listing.seller.username}</p>
                      </div>
                    </div>
                    <div className="p-2.5 pt-0">
                      <p className="text-base font-black text-yellow-400 mb-0.5">{listing.price.toLocaleString()} ₱</p>
                      <p className="text-xs text-gray-600 font-mono mb-1">≈ {toUSD(listing.price)}</p>
                      {listing.isMine ? (
                        <button onClick={() => cancelListing(listing.id)}
                          className="w-full py-1.5 text-xs font-bold rounded-lg bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 border border-gray-700 hover:border-red-500/30 transition-colors">
                          Cancel
                        </button>
                      ) : (
                        <button onClick={() => setConfirmListing(listing)}
                          disabled={balance !== null && balance < listing.price}
                          className={`w-full py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            balance !== null && balance < listing.price
                              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                              : "bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/40 hover:border-orange-500"
                          }`}>
                          Buy Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SELL SKINS ── */}
        {tab === "sell" && (
          <div>
            <p className="text-sm text-gray-500 mb-6">Select an item from your stash to list. A <span className="text-orange-400 font-bold">5% fee</span> is taken on sale.</p>
            {stash.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-gray-400 font-bold text-lg">Your stash is empty</p>
                <p className="text-gray-600 text-sm mt-2">Open some cases first</p>
                <button onClick={() => window.location.href = "/cases"} className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors">Open Cases</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {stash.map(si => (
                  <div key={si.id}
                    className={`rounded-xl border flex flex-col overflow-hidden transition-all ${si.listed ? "opacity-50" : "cursor-pointer hover:scale-105"}`}
                    style={{ borderColor: `${RARITY_COLORS[si.item.rarity]}44`, background: `${RARITY_COLORS[si.item.rarity]}0d` }}
                    onClick={() => { if (!si.listed) { setListingItem(si); setListPrice(String(si.item.sellValue)); } }}
                  >
                    <div className="h-0.5 w-full" style={{ background: RARITY_COLORS[si.item.rarity] }} />
                    <div className="flex items-center justify-center h-24 p-2" style={{ background: `${RARITY_COLORS[si.item.rarity]}12` }}>
                      <ItemImg item={si.item} imageMap={imageMap} size={88} />
                    </div>
                    <div className="p-2.5 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: RARITY_COLORS[si.item.rarity] }}>{RARITY_LABEL[si.item.rarity]}</p>
                      <p className="text-xs text-white font-bold leading-tight mt-0.5 line-clamp-2">{si.item.name}</p>
                      <p className="text-xs text-yellow-500 mt-1">{si.item.sellValue.toLocaleString()} ₱ base</p>
                    </div>
                    <div className="px-2.5 pb-2.5">
                      {si.listed ? (
                        <div className="w-full py-1.5 text-center text-xs font-bold rounded-lg bg-gray-800 text-gray-500">Listed</div>
                      ) : (
                        <div className="w-full py-1.5 text-center text-xs font-bold rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40">List on Market</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY LISTINGS ── */}
        {tab === "my" && (
          <div>
            {myListings.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-400 font-bold text-lg">No listings yet</p>
                <button onClick={() => loadTab("sell")} className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors">List an Item</button>
              </div>
            ) : (
              <div className="space-y-2">
                {myListings.map(l => (
                  <div key={l.id} className="flex items-center gap-4 rounded-xl border p-3"
                    style={{ borderColor: `${RARITY_COLORS[l.item.rarity] ?? "#374151"}33`, background: `${RARITY_COLORS[l.item.rarity] ?? "#0d0d15"}08` }}>
                    <div className="w-16 h-12 shrink-0 flex items-center justify-center">
                      <ItemImg item={l.item} imageMap={imageMap} size={60} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: RARITY_COLORS[l.item.rarity] }}>{RARITY_LABEL[l.item.rarity]}</p>
                      <p className="text-sm font-bold text-white truncate">{l.item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(l.createdAt).toLocaleDateString()}{l.soldAt && ` → sold ${new Date(l.soldAt).toLocaleDateString()}`}</p>
                      {l.buyer && <p className="text-xs text-gray-600">Bought by <span className="text-gray-400">{l.buyer.username}</span></p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-base font-black text-yellow-400">{l.price.toLocaleString()} ₱</p>
                        <p className="text-xs text-gray-600 font-mono">≈ {toUSD(l.price)}</p>
                        {l.status === "active" && <p className="text-xs text-gray-600">You get: {sellerPayout(l.price).toLocaleString()} ₱</p>}
                      </div>
                      <StatusBadge status={l.status} />
                      {l.status === "active" && (
                        <button onClick={() => cancelListing(l.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-20">No sales yet</p>
            ) : (
              <div className="space-y-2">
                {history.map(s => (
                  <div key={s.id} className="flex items-center gap-4 rounded-xl border p-3"
                    style={{ borderColor: `${RARITY_COLORS[s.item.rarity] ?? "#374151"}22`, background: `${RARITY_COLORS[s.item.rarity] ?? "#0d0d15"}06` }}>
                    <div className="w-14 h-10 shrink-0 flex items-center justify-center">
                      <ItemImg item={s.item} imageMap={imageMap} size={56} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{s.item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Image src={s.seller.avatar} alt={s.seller.username} width={14} height={14} className="rounded-full" />
                        <span className="text-xs text-gray-500">{s.seller.username}</span>
                        <span className="text-xs text-gray-700">→</span>
                        {s.buyer && (
                          <>
                            <Image src={s.buyer.avatar} alt={s.buyer.username} width={14} height={14} className="rounded-full" />
                            <span className="text-xs text-gray-500">{s.buyer.username}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-yellow-400">{s.price.toLocaleString()} ₱</p>
                      <p className="text-xs text-gray-600 font-mono">≈ {toUSD(s.price)}</p>
                      <p className="text-xs text-gray-600">{s.soldAt ? new Date(s.soldAt).toLocaleString() : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CASES TAB ── */}
        {tab === "cases" && (
          <div>
            <div className="flex gap-1 mb-6 border-b border-gray-800/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
              {([
                ["browse", "Browse Cases"],
                ["sell",   "Sell Cases"],
                ["my",     "My Case Listings"],
              ] as const).map(([t, label]) => (
                <button key={t} onClick={() => loadCaseSubTab(t)}
                  className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
                    caseSubTab === t ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >{label}</button>
              ))}
            </div>

            {/* Browse Cases */}
            {caseSubTab === "browse" && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs text-gray-600 font-bold uppercase tracking-wider shrink-0">Sort:</span>
                  {[["newest", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"]].map(([v, label]) => (
                    <button key={v} onClick={() => setCaseSort(v)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        caseSort === v ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      }`}>{label}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mb-4">{caseListings.length} listing{caseListings.length !== 1 ? "s" : ""}</p>
                {caseListings.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-5xl mb-4">📦</div>
                    <p className="text-gray-400 font-bold text-lg">No cases listed</p>
                    <p className="text-gray-600 text-sm mt-2">Buy cases from the <a href="/cases" className="text-orange-400 hover:underline">Case Shop</a> and list them here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {caseListings.map(listing => (
                      <div key={listing.id} className="rounded-xl border border-orange-500/20 bg-orange-500/5 flex flex-col overflow-hidden hover:border-orange-500/40 transition-all">
                        <div className="h-0.5 w-full bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />
                        <div className="flex items-center justify-center h-24 bg-orange-500/10 text-5xl">
                          {listing.caseType.imageEmoji}
                        </div>
                        <div className="flex flex-col gap-1 p-3 flex-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Psyko Case</p>
                          <p className="text-sm text-white font-black leading-tight">{listing.caseType.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Image src={listing.seller.avatar} alt={listing.seller.username} width={14} height={14} className="rounded-full" />
                            <p className="text-xs text-gray-500 truncate">{listing.seller.username}</p>
                          </div>
                        </div>
                        <div className="p-3 pt-0">
                          <p className="text-base font-black text-yellow-400 mb-0.5">{listing.price.toLocaleString()} ₱</p>
                          <p className="text-xs text-gray-600 font-mono mb-1">≈ {toUSD(listing.price)}</p>
                          {listing.isMine ? (
                            <button onClick={() => cancelCaseListing(listing.id)}
                              className="w-full py-1.5 text-xs font-bold rounded-lg bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 border border-gray-700 hover:border-red-500/30 transition-colors">
                              Cancel
                            </button>
                          ) : (
                            <button onClick={() => setConfirmCaseListing(listing)}
                              disabled={balance !== null && balance < listing.price}
                              className={`w-full py-1.5 text-xs font-bold rounded-lg transition-colors ${
                                balance !== null && balance < listing.price
                                  ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                                  : "bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/40 hover:border-orange-500"
                              }`}>
                              Buy Now
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sell Cases */}
            {caseSubTab === "sell" && (
              <div>
                <p className="text-sm text-gray-500 mb-6">List unopened cases from your inventory. A <span className="text-orange-400 font-bold">5% fee</span> is taken on sale.</p>
                {myCaseInventory.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-5xl mb-4">📦</div>
                    <p className="text-gray-400 font-bold text-lg">No cases to sell</p>
                    <p className="text-gray-600 text-sm mt-2">Buy cases from the shop first</p>
                    <a href="/cases" className="mt-6 inline-block px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors">Case Shop</a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {myCaseInventory.map(uc => (
                      <div key={uc.id}
                        className={`rounded-xl border border-orange-500/20 flex flex-col overflow-hidden transition-all ${uc.listed ? "opacity-50" : "cursor-pointer hover:scale-105 hover:border-orange-500/50"}`}
                        onClick={() => { if (!uc.listed) { setListingCase(uc); setListCasePrice(String(uc.caseType.price)); } }}
                      >
                        <div className="h-0.5 w-full bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />
                        <div className="flex items-center justify-center h-24 bg-orange-500/10 text-5xl">
                          {uc.caseType.imageEmoji}
                        </div>
                        <div className="p-2.5 flex-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Psyko Case</p>
                          <p className="text-xs text-white font-bold leading-tight mt-0.5">{uc.caseType.name}</p>
                          <p className="text-xs text-yellow-500 mt-1">{uc.caseType.price.toLocaleString()} ₱ shop price</p>
                        </div>
                        <div className="px-2.5 pb-2.5">
                          {uc.listed ? (
                            <div className="w-full py-1.5 text-center text-xs font-bold rounded-lg bg-gray-800 text-gray-500">Listed</div>
                          ) : (
                            <div className="w-full py-1.5 text-center text-xs font-bold rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40">List on Market</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Case Listings */}
            {caseSubTab === "my" && (
              <div>
                {myCaseListings.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-gray-400 font-bold text-lg">No case listings yet</p>
                    <button onClick={() => loadCaseSubTab("sell")} className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm transition-colors">List a Case</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myCaseListings.map(l => (
                      <div key={l.id} className="flex items-center gap-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                        <div className="w-12 h-12 shrink-0 flex items-center justify-center text-3xl bg-orange-500/10 rounded-lg">
                          {l.caseType.imageEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white truncate">{l.caseType.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(l.createdAt).toLocaleDateString()}
                            {l.soldAt && ` → sold ${new Date(l.soldAt).toLocaleDateString()}`}
                          </p>
                          {l.buyer && <p className="text-xs text-gray-600">Bought by <span className="text-gray-400">{l.buyer.username}</span></p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-base font-black text-yellow-400">{l.price.toLocaleString()} ₱</p>
                            {l.status === "active" && <p className="text-xs text-gray-600">You get: {sellerPayout(l.price).toLocaleString()} ₱</p>}
                          </div>
                          <StatusBadge status={l.status} />
                          {l.status === "active" && (
                            <button onClick={() => cancelCaseListing(l.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">Cancel</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── BUY SKIN CONFIRM MODAL ── */}
      {confirmListing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmListing(null)}>
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white mb-4">Confirm Purchase</h3>
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl"
              style={{ background: `${RARITY_COLORS[confirmListing.item.rarity]}12`, borderWidth: 1, borderStyle: "solid", borderColor: `${RARITY_COLORS[confirmListing.item.rarity]}44` }}>
              <div className="w-20 h-16 flex items-center justify-center shrink-0">
                <ItemImg item={confirmListing.item} imageMap={imageMap} size={75} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase" style={{ color: RARITY_COLORS[confirmListing.item.rarity] }}>{RARITY_LABEL[confirmListing.item.rarity]}</p>
                <p className="text-sm font-bold text-white">{confirmListing.item.name}</p>
                <p className="text-xs text-gray-500">from {confirmListing.seller.username}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mb-6 text-sm">
              <span className="text-gray-400">Price</span>
              <span className="text-yellow-400 font-black text-xl">{confirmListing.price.toLocaleString()} ₱</span>
            </div>
            {balance !== null && (
              <p className="text-xs text-gray-600 mb-4 text-center">
                Balance after: <span className="text-yellow-500 font-bold">{(balance - confirmListing.price).toLocaleString()} ₱</span>
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmListing(null)} className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={() => buyListing(confirmListing)} disabled={buyingId === confirmListing.id}
                className="flex-1 py-2.5 text-sm font-black rounded-xl bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
                {buyingId === confirmListing.id ? "Buying…" : "Buy Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUY CASE CONFIRM MODAL ── */}
      {confirmCaseListing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmCaseListing(null)}>
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white mb-4">Buy Case</h3>
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="text-4xl shrink-0">{confirmCaseListing.caseType.imageEmoji}</div>
              <div>
                <p className="text-xs font-bold uppercase text-orange-400">Psyko Case</p>
                <p className="text-sm font-bold text-white">{confirmCaseListing.caseType.name}</p>
                <p className="text-xs text-gray-500">from {confirmCaseListing.seller.username}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mb-6 text-sm">
              <span className="text-gray-400">Price</span>
              <span className="text-yellow-400 font-black text-xl">{confirmCaseListing.price.toLocaleString()} ₱</span>
            </div>
            {balance !== null && (
              <p className="text-xs text-gray-600 mb-4 text-center">
                Balance after: <span className="text-yellow-500 font-bold">{(balance - confirmCaseListing.price).toLocaleString()} ₱</span>
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmCaseListing(null)} className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={() => buyCaseListing(confirmCaseListing)} disabled={buyingCaseId === confirmCaseListing.id}
                className="flex-1 py-2.5 text-sm font-black rounded-xl bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
                {buyingCaseId === confirmCaseListing.id ? "Buying…" : "Buy Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST ITEM MODAL ── */}
      {listingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setListingItem(null)}>
          <div className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white mb-4">List on Market</h3>
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl"
              style={{ background: `${RARITY_COLORS[listingItem.item.rarity]}12`, borderWidth: 1, borderStyle: "solid", borderColor: `${RARITY_COLORS[listingItem.item.rarity]}44` }}>
              <div className="w-20 h-16 flex items-center justify-center shrink-0">
                <ItemImg item={listingItem.item} imageMap={imageMap} size={75} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase" style={{ color: RARITY_COLORS[listingItem.item.rarity] }}>{RARITY_LABEL[listingItem.item.rarity]}</p>
                <p className="text-sm font-bold text-white">{listingItem.item.name}</p>
                <p className="text-xs text-gray-500">Base value: {listingItem.item.sellValue.toLocaleString()} ₱</p>
              </div>
            </div>
            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Your Price (₱)</label>
            <input type="number" min={1} value={listPrice} onChange={e => setListPrice(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-xl px-4 py-3 text-white text-xl font-black focus:outline-none focus:border-orange-500/60 mb-2"
              placeholder="Enter price" />
            {listPrice && parseInt(listPrice) > 0 && (
              <p className="text-xs text-gray-600 mb-4">
                You receive: <span className="text-yellow-400 font-bold">{sellerPayout(parseInt(listPrice)).toLocaleString()} ₱</span>
                <span className="text-gray-700"> (after 5% fee)</span>
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setListingItem(null)} className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={listItem} disabled={listingInProgress || !listPrice || parseInt(listPrice) < 1}
                className="flex-1 py-2.5 text-sm font-black rounded-xl bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
                {listingInProgress ? "Listing…" : "List Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST CASE MODAL ── */}
      {listingCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setListingCase(null)}>
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
            <input type="number" min={1} value={listCasePrice} onChange={e => setListCasePrice(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-xl px-4 py-3 text-white text-xl font-black focus:outline-none focus:border-orange-500/60 mb-2"
              placeholder="Enter price" />
            {listCasePrice && parseInt(listCasePrice) > 0 && (
              <p className="text-xs text-gray-600 mb-4">
                You receive: <span className="text-yellow-400 font-bold">{sellerPayout(parseInt(listCasePrice)).toLocaleString()} ₱</span>
                <span className="text-gray-700"> (after 5% fee)</span>
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setListingCase(null)} className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={listCase} disabled={listCaseInProgress || !listCasePrice || parseInt(listCasePrice) < 1}
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
