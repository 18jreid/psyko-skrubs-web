"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RARITY_LABEL, WEAR_RANGES, getWearFromName, toUSD } from "@/lib/caseItems";
import imageData from "@/lib/itemImages.json";

const staticImages = imageData as Record<string, string | null>;

interface StashItem {
  id: string;
  obtainedAt: string;
  sold: boolean;
  float: number | null;
  item: {
    id: string;
    name: string;
    rarity: string;
    color: string;
    emoji: string;
    sellValue: number;
  };
}

const WEAR_COLORS = [
  { label: "Factory New",    color: "#4ade80", range: [0.00, 0.07] },
  { label: "Minimal Wear",   color: "#a3e635", range: [0.07, 0.15] },
  { label: "Field-Tested",   color: "#facc15", range: [0.15, 0.38] },
  { label: "Well-Worn",      color: "#fb923c", range: [0.38, 0.45] },
  { label: "Battle-Scarred", color: "#f87171", range: [0.45, 1.00] },
] as const;

function FloatBar({ float }: { float: number }) {
  const pct = float * 100;
  const wear = WEAR_COLORS.find(w => float >= w.range[0] && float < w.range[1]) ?? WEAR_COLORS[4];

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Segment bar */}
      <div className="flex rounded-full overflow-hidden h-2 mb-2">
        {WEAR_COLORS.map((w, i) => {
          const segWidth = (w.range[1] - w.range[0]) * 100;
          return (
            <div key={i} style={{ width: `${segWidth}%`, background: w.color, opacity: wear.label === w.label ? 1 : 0.25 }} />
          );
        })}
      </div>
      {/* Needle */}
      <div className="relative h-3">
        <div className="absolute top-0 w-0.5 h-3 rounded-full -translate-x-1/2"
          style={{ left: `${pct}%`, background: wear.color, boxShadow: `0 0 6px ${wear.color}` }} />
      </div>
      {/* Wear labels */}
      <div className="flex justify-between mt-1">
        {WEAR_COLORS.map(w => (
          <span key={w.label} className="text-xs font-bold" style={{ color: wear.label === w.label ? w.color : "#4b5563" }}>
            {w.label.split(" ").map(word => word[0]).join("")}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function InspectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StashItem | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/cases/inventory/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true));
  }, [id]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 text-lg font-bold mb-4">Item not found</p>
        <button onClick={() => router.back()} className="text-orange-400 hover:underline text-sm">← Back</button>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { item, float } = data;
  const imageUrl = staticImages[item.id];
  const wearLabel = getWearFromName(item.name);
  const [weaponPart, skinPart] = item.name.split(" | ");
  const skinName = skinPart?.replace(/\s*\(.*?\)$/, "") ?? item.name;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #0a0a0f 0%, #0f0f1a 100%)" }}>
      {/* Back */}
      <div className="max-w-3xl mx-auto w-full px-6 pt-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 2L5 8l6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Stash
        </button>
      </div>

      {/* Main card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Rarity header stripe */}
          <div className="h-1 w-full rounded-t-2xl" style={{ background: `linear-gradient(to right, transparent, ${item.color}, transparent)` }} />

          <div className="rounded-b-2xl border border-gray-800/60 bg-[#0d0d18]/90 backdrop-blur-sm overflow-hidden"
            style={{ boxShadow: `0 0 60px ${item.color}18` }}>

            {/* Item image */}
            <div className="relative flex items-center justify-center py-10 px-8"
              style={{ background: `radial-gradient(ellipse at center, ${item.color}12 0%, transparent 70%)` }}>
              {imageUrl ? (
                <img src={imageUrl} alt={item.name} className="w-72 h-52 object-contain drop-shadow-2xl" />
              ) : (
                <span className="text-8xl">{item.emoji}</span>
              )}
            </div>

            {/* Info */}
            <div className="px-8 pb-8 space-y-6">
              {/* Name block */}
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: item.color }}>
                  {RARITY_LABEL[item.rarity]}
                </p>
                <p className="text-gray-400 text-sm font-medium">{weaponPart}</p>
                <h1 className="text-3xl font-black text-white leading-tight">{skinName}</h1>
                {wearLabel && (
                  <p className="text-gray-500 text-sm mt-1">{wearLabel}</p>
                )}
              </div>

              {/* Float bar */}
              {float !== null ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Float Value</p>
                    <p className="text-2xl font-mono font-black text-white">{float.toFixed(10)}</p>
                  </div>
                  <FloatBar float={float} />
                </div>
              ) : (
                <p className="text-center text-xs text-gray-700">No float data — item obtained before float tracking</p>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800/60">
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Sell Value</p>
                  <p className="text-xl font-black text-yellow-400">{item.sellValue.toLocaleString()} ₱</p>
                  <p className="text-xs text-gray-600 font-mono mt-0.5">≈ {toUSD(item.sellValue)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wider font-bold mb-1">Obtained</p>
                  <p className="text-sm font-bold text-gray-300">{new Date(data.obtainedAt).toLocaleDateString()}</p>
                </div>
              </div>

              {data.sold && (
                <p className="text-center text-xs text-gray-600 italic">This item has been sold</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
