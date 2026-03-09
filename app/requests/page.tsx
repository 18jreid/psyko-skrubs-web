"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSession, signIn } from "next-auth/react";
import GameRequestCard from "@/components/GameRequestCard";
import GameRequestModal from "@/components/GameRequestModal";

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

interface CommonGame {
  appid: number;
  name: string;
  playtime_forever: number;
  avg_playtime: number;
  header_image: string;
}

export default function RequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [commonGames, setCommonGames] = useState<CommonGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [commonLoading, setCommonLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "common">("requests");

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/games/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const fetchCommonGames = async () => {
    setCommonLoading(true);
    setActiveTab("common");
    try {
      const res = await fetch("/api/games/common");
      if (res.ok) {
        const data = await res.json();
        setCommonGames(data);
      }
    } catch (err) {
      console.error("Error fetching common games:", err);
    } finally {
      setCommonLoading(false);
    }
  };

  const handleAddRequest = () => {
    if (!session) {
      signIn("steam");
      return;
    }
    setShowModal(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">
                Game{" "}
                <span className="text-orange-500">Requests</span>
              </h1>
              <p className="text-gray-500 mt-1">
                Vote on what the group should play next
              </p>
            </div>
            <button
              onClick={handleAddRequest}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-900/30 self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Request a Game
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 bg-[#0a0a0f] p-1 rounded-xl border border-gray-800 w-fit">
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "requests"
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              All Requests
            </button>
            <button
              onClick={fetchCommonGames}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === "common"
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {commonLoading && (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Games We All Own
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "requests" ? (
          <>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-[#0d0d15] border border-gray-800 rounded-xl h-24 animate-pulse" />
                ))}
              </div>
            ) : requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((request) => (
                  <GameRequestCard
                    key={request.id}
                    request={request}
                    currentUserId={session?.user?.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">
                  No game requests yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Be the first to suggest a game for the group!
                </p>
                <button
                  onClick={handleAddRequest}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
                >
                  Request a Game
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {commonLoading ? (
              <div>
                <div className="flex items-center gap-3 mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-blue-400/80 text-sm">
                    Fetching game libraries from Steam API... This may take a moment.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-[#0d0d15] border border-gray-800 rounded-xl h-32 animate-pulse" />
                  ))}
                </div>
              </div>
            ) : commonGames.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <p className="text-sm text-gray-400">
                    Found{" "}
                    <span className="text-white font-semibold">{commonGames.length}</span>{" "}
                    games owned by all members — sorted by average playtime
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {commonGames.map((game) => (
                    <div
                      key={game.appid}
                      className="bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all"
                    >
                      <div className="relative h-28 bg-[#0a0a12]">
                        <Image
                          src={game.header_image}
                          alt={game.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d15] via-transparent to-transparent" />
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-white text-sm">{game.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            Avg. {Math.round(game.avg_playtime / 60)}h played
                          </span>
                          <a
                            href={`https://store.steampowered.com/app/${game.appid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Steam Store
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">
                  No common games found
                </h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  This could mean member profiles are private, or no games are
                  shared by all members yet. Make sure everyone has signed in!
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <GameRequestModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}
