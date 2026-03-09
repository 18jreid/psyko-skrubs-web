"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

interface GameVote {
  userId: string;
  value: number;
}

interface GameRequest {
  id: string;
  steamAppId: string;
  gameName: string;
  headerImage?: string | null;
  description?: string | null;
  score: number;
  votes: GameVote[];
  user: {
    id: string;
    username: string;
    avatar: string;
  };
}

interface GameRequestCardProps {
  request: GameRequest;
  currentUserId?: string;
}

export default function GameRequestCard({
  request,
  currentUserId,
}: GameRequestCardProps) {
  const { data: session } = useSession();
  const [score, setScore] = useState(request.score);
  const [userVote, setUserVote] = useState<number>(() => {
    if (!currentUserId) return 0;
    const vote = request.votes.find((v) => v.userId === currentUserId);
    return vote?.value || 0;
  });
  const [loading, setLoading] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    if (!session) {
      signIn("steam");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/games/requests/${request.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
        setUserVote(data.userVote);
      }
    } catch (err) {
      console.error("Error voting:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all duration-300 flex flex-col sm:flex-row">
      {/* Game image */}
      <div className="sm:w-48 h-28 sm:h-auto flex-shrink-0 bg-[#0a0a12] relative overflow-hidden">
        {request.headerImage ? (
          <Image
            src={request.headerImage}
            alt={request.gameName}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-bold text-white text-sm leading-tight">{request.gameName}</h3>
            <a
              href={`https://store.steampowered.com/app/${request.steamAppId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-1 text-gray-600 hover:text-blue-400 transition-colors"
              title="View on Steam"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          {request.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{request.description}</p>
          )}
          <p className="text-xs text-gray-600">
            Requested by <span className="text-gray-500">{request.user.username}</span>
          </p>
        </div>

        {/* Voting */}
        <div className="flex sm:flex-col items-center gap-2">
          <button
            onClick={() => handleVote(1)}
            disabled={loading}
            className={`p-2 rounded-lg transition-all ${
              userVote === 1
                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                : "bg-gray-800 text-gray-500 border border-gray-700 hover:border-green-500/40 hover:text-green-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          <div
            className={`text-center font-bold text-lg min-w-[2rem] ${
              score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-gray-500"
            }`}
          >
            {score}
          </div>

          <button
            onClick={() => handleVote(-1)}
            disabled={loading}
            className={`p-2 rounded-lg transition-all ${
              userVote === -1
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-gray-800 text-gray-500 border border-gray-700 hover:border-red-500/40 hover:text-red-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
