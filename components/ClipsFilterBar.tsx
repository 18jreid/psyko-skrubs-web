"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import AllstarClipCard from "@/components/AllstarClipCard";
import type { AllstarClipWithUser } from "@/lib/allstar";

const PAGE_SIZE = 12;

interface ClipsFilterBarProps {
  clips: AllstarClipWithUser[];
  players: { username: string; userAvatar: string }[];
  voteMap?: Record<string, { score: number; userVote: number }>;
  isLoggedIn?: boolean;
}

type SortKey = "date" | "views" | "top";

export default function ClipsFilterBar({ clips, players, voteMap = {}, isLoggedIn = false }: ClipsFilterBarProps) {
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let result =
      playerFilter === "all"
        ? clips
        : clips.filter((c) => c.username === playerFilter);

    result = [...result].sort((a, b) => {
      if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "top") return (voteMap[b.shareId]?.score ?? 0) - (voteMap[a.shareId]?.score ?? 0);
      return b.views - a.views;
    });

    return result;
  }, [clips, playerFilter, sortBy, voteMap]);

  // Reset page when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [playerFilter, sortBy]);

  // Infinite scroll sentinel
  const loadMore = useCallback(() => {
    setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const uniquePlayers = Array.from(new Set(clips.map((c) => c.username)));

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
        {/* Player filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider shrink-0">
            Player:
          </span>
          <button
            onClick={() => setPlayerFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              playerFilter === "all"
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            All
          </button>
          {uniquePlayers.map((name) => (
            <button
              key={name}
              onClick={() => setPlayerFilter(name)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                playerFilter === name
                  ? "bg-orange-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Sort — pushed right on sm+ */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider shrink-0">
            Sort:
          </span>
          <button
            onClick={() => setSortBy("date")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortBy === "date"
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortBy("views")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortBy === "views"
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Most Viewed
          </button>
          <button
            onClick={() => setSortBy("top")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortBy === "top"
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Top Rated
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visible.map((clip) => (
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

          {/* Sentinel / loading indicator */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center items-center py-10 gap-2 text-gray-600 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading more clips…
            </div>
          )}

          {!hasMore && filtered.length > PAGE_SIZE && (
            <p className="text-center text-xs text-gray-700 py-6">
              All {filtered.length} clips loaded
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-10 h-10 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-400 mb-2">No clips found</h3>
          <p className="text-gray-600">
            {playerFilter !== "all"
              ? `${playerFilter} hasn't posted any clips yet.`
              : "No clips have been recorded yet."}
          </p>
          {playerFilter !== "all" && (
            <button
              onClick={() => setPlayerFilter("all")}
              className="mt-5 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Show all clips
            </button>
          )}
        </div>
      )}
    </div>
  );
}
