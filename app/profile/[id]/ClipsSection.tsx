"use client";

import { useState, useMemo } from "react";
import AllstarClipCard from "@/components/AllstarClipCard";
import type { AllstarClipWithUser } from "@/lib/allstar";

type SortKey = "date" | "views" | "top";

interface Props {
  clips: AllstarClipWithUser[];
  voteMap: Record<string, { score: number; userVote: number }>;
  isLoggedIn: boolean;
}

export default function ClipsSection({ clips, voteMap, isLoggedIn }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");

  const filtered = useMemo(() => {
    let result = search.trim()
      ? clips.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
      : clips;

    result = [...result].sort((a, b) => {
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "top") return (voteMap[b.shareId]?.score ?? 0) - (voteMap[a.shareId]?.score ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [clips, search, sortBy, voteMap]);

  if (clips.length === 0) {
    return (
      <div className="bg-[#0d0d15] border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
        No Allstar clips found for this player.
      </div>
    );
  }

  const SortBtn = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => setSortBy(field)}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
        sortBy === field ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clips..."
            className="w-full bg-[#0a0a0f] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sort:</span>
          <SortBtn label="Newest" field="date" />
          <SortBtn label="Most Viewed" field="views" />
          <SortBtn label="Top Rated" field="top" />
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-600 mb-4">
        {filtered.length} of {clips.length} clip{clips.length !== 1 ? "s" : ""}
        {search ? ` matching "${search}"` : ""}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((clip) => (
            <AllstarClipCard
              key={clip.id}
              shareId={clip.shareId}
              title={clip.title}
              thumbnailUrl={clip.thumbnailUrl}
              username={clip.username}
              userAvatar={clip.userAvatar}
              createdAt={clip.createdAt}
              views={clip.views}
              game={clip.game}
              score={voteMap[clip.shareId]?.score ?? 0}
              userVote={voteMap[clip.shareId]?.userVote ?? 0}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-[#0d0d15] border border-gray-800 rounded-xl">
          <p className="text-gray-500 text-sm">No clips match your search.</p>
          <button onClick={() => setSearch("")} className="mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors">
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
