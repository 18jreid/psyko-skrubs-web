"use client";

import { useState, useMemo } from "react";
import AllstarClipCard from "@/components/AllstarClipCard";
import type { AllstarClipWithUser } from "@/lib/allstar";

interface ClipsFilterBarProps {
  clips: AllstarClipWithUser[];
  players: { username: string; userAvatar: string }[];
}

type SortKey = "date" | "views";

export default function ClipsFilterBar({ clips, players }: ClipsFilterBarProps) {
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");

  const filtered = useMemo(() => {
    let result =
      playerFilter === "all"
        ? clips
        : clips.filter((c) => c.username === playerFilter);

    result = [...result].sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return b.views - a.views;
    });

    return result;
  }, [clips, playerFilter, sortBy]);

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
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            />
          ))}
        </div>
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
