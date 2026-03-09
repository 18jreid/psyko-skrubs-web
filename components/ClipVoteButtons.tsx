"use client";

import { useState } from "react";

interface Props {
  shareId: string;
  initialScore: number;
  initialUserVote: number;
  isLoggedIn: boolean;
}

export default function ClipVoteButtons({ shareId, initialScore, initialUserVote, isLoggedIn }: Props) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);

  async function vote(value: 1 | -1) {
    if (!isLoggedIn || loading) return;
    setLoading(true);

    // Optimistic update
    const prevScore = score;
    const prevVote = userVote;
    const newVote = userVote === value ? 0 : value;
    const scoreDelta = newVote - userVote;
    setScore(score + scoreDelta);
    setUserVote(newVote);

    try {
      const res = await fetch(`/api/clips/${encodeURIComponent(shareId)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
        setUserVote(data.userVote);
      } else {
        setScore(prevScore);
        setUserVote(prevVote);
      }
    } catch {
      setScore(prevScore);
      setUserVote(prevVote);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.preventDefault()} // prevent card link navigation
    >
      <button
        onClick={() => vote(1)}
        disabled={!isLoggedIn || loading}
        className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${userVote === 1 ? "text-green-400" : "text-gray-600 hover:text-green-400"} disabled:cursor-default`}
        title={isLoggedIn ? "Upvote" : "Sign in to vote"}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4l8 8H4z" />
        </svg>
      </button>
      <span className={`text-xs font-black tabular-nums ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-gray-600"}`}>
        {score > 0 ? `+${score}` : score}
      </span>
      <button
        onClick={() => vote(-1)}
        disabled={!isLoggedIn || loading}
        className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${userVote === -1 ? "text-red-400" : "text-gray-600 hover:text-red-400"} disabled:cursor-default`}
        title={isLoggedIn ? "Downvote" : "Sign in to vote"}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 20l-8-8h16z" />
        </svg>
      </button>
    </div>
  );
}
