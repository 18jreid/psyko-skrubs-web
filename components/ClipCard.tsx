"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { getEmbedUrl } from "@/lib/steam";

interface ClipUser {
  id: string;
  username: string;
  avatar: string;
  steamId: string;
}

interface Clip {
  id: string;
  title: string;
  url: string;
  platform: string;
  description?: string | null;
  createdAt: string;
  user: ClipUser;
  likes: { userId: string }[];
  _count: { likes: number };
}

interface ClipCardProps {
  clip: Clip;
  currentUserId?: string;
}

export default function ClipCard({ clip, currentUserId }: ClipCardProps) {
  const { data: session } = useSession();
  const [likeCount, setLikeCount] = useState(clip._count.likes);
  const [liked, setLiked] = useState(
    currentUserId ? clip.likes.some((l) => l.userId === currentUserId) : false
  );
  const [loading, setLoading] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const embedUrl = getEmbedUrl(clip.url, clip.platform);

  const handleLike = async () => {
    if (!session) {
      signIn("steam");
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clips/${clip.id}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.count);
      }
    } catch (err) {
      console.error("Error liking clip:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformBadge = () => {
    switch (clip.platform) {
      case "youtube":
        return (
          <span className="px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded border border-red-500/30 font-medium">
            YouTube
          </span>
        );
      case "streamable":
        return (
          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded border border-blue-500/30 font-medium">
            Streamable
          </span>
        );
      case "medal":
        return (
          <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs rounded border border-yellow-500/30 font-medium">
            Medal.tv
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-600/20 text-gray-400 text-xs rounded border border-gray-500/30 font-medium">
            Link
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/40 transition-all duration-300 group">
      {/* Video/Embed area */}
      <div className="relative aspect-video bg-[#0a0a12] flex items-center justify-center">
        {showEmbed && embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer group-hover:bg-black/20 transition-colors"
            onClick={() => {
              if (embedUrl) {
                setShowEmbed(true);
              } else {
                window.open(clip.url, "_blank");
              }
            }}
          >
            {clip.platform === "youtube" && embedUrl && (
              <div className="relative">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm text-gray-400">Click to play</p>
              </div>
            )}
            {clip.platform === "streamable" && embedUrl && (
              <div className="relative">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/50 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm text-gray-400">Click to play</p>
              </div>
            )}
            {(clip.platform === "medal" || !embedUrl) && (
              <div className="text-center px-4">
                <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-500/20 transition-colors">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Open clip</p>
                <p className="text-xs text-gray-600 mt-1 truncate max-w-[200px]">{clip.url}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-white text-sm leading-tight">{clip.title}</h3>
            {clip.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{clip.description}</p>
            )}
          </div>
          {getPlatformBadge()}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src={clip.user.avatar}
              alt={clip.user.username}
              width={24}
              height={24}
              className="rounded-full border border-gray-700"
            />
            <span className="text-xs text-gray-400">{clip.user.username}</span>
          </div>

          <button
            onClick={handleLike}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              liked
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-orange-500/40 hover:text-orange-400"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            {likeCount}
          </button>
        </div>
      </div>
    </div>
  );
}
