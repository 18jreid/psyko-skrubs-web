import Image from "next/image";
import { allstarClipUrl } from "@/lib/allstar";
import ClipVoteButtons from "@/components/ClipVoteButtons";

export interface AllstarClipCardProps {
  shareId: string;
  title: string;
  thumbnailUrl: string;
  username: string;
  userAvatar: string;
  createdAt: string;
  views: number;
  game: string;
  score?: number;
  userVote?: number;
  isLoggedIn?: boolean;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatViews(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default function AllstarClipCard({
  shareId,
  title,
  thumbnailUrl,
  username,
  userAvatar,
  createdAt,
  views,
  game,
  score = 0,
  userVote = 0,
  isLoggedIn = false,
}: AllstarClipCardProps) {
  const clipUrl = allstarClipUrl(shareId);
  const isValidThumb =
    thumbnailUrl &&
    (thumbnailUrl.startsWith("https://") || thumbnailUrl.startsWith("http://"));

  return (
    <a
      href={clipUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-900/10 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#080810] overflow-hidden">
        {isValidThumb ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a14]">
            <svg
              className="w-12 h-12 text-gray-700"
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
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center group-hover:bg-orange-500/80 group-hover:border-orange-400/40 transition-all duration-300 backdrop-blur-sm">
            <svg
              className="w-5 h-5 text-white ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* CS2 badge */}
        {game && (
          <div className="absolute top-2 left-2">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-500/90 text-white uppercase tracking-wider">
              {game === "cs2" || game === "CS2" ? "CS2" : game}
            </span>
          </div>
        )}

        {/* View count */}
        <div className="absolute bottom-2 right-2">
          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/70 text-gray-300 backdrop-blur-sm">
            <svg
              className="w-2.5 h-2.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
            {formatViews(views)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-sm font-semibold text-white leading-tight line-clamp-2 group-hover:text-orange-300 transition-colors">
          {title || "Untitled Clip"}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 min-w-0">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={username}
                width={18}
                height={18}
                className="rounded-full border border-gray-700 shrink-0"
              />
            ) : (
              <div className="w-4.5 h-4.5 rounded-full bg-gray-700 shrink-0" />
            )}
            <span className="text-xs text-gray-400 truncate">{username}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <ClipVoteButtons
              shareId={shareId}
              initialScore={score}
              initialUserVote={userVote}
              isLoggedIn={isLoggedIn}
            />
            <span className="text-[10px] text-gray-600">
              {relativeDate(createdAt)}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
