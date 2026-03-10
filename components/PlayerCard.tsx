import Image from "next/image";

export interface PlayerCardProps {
  username: string;
  avatar: string;
  profileUrl: string;
  steamId: string;
  kdRatio: number | null;
  totalWins: number | null;
  hoursPlayed: number | null;
  allstarClipCount: number;
  isPrivate: boolean;
  inventoryValue: number | null;
}

function kdColor(kd: number): string {
  if (kd >= 1.5) return "text-green-400";
  if (kd >= 1.0) return "text-yellow-400";
  return "text-red-400";
}

export default function PlayerCard({
  username,
  avatar,
  profileUrl,
  kdRatio,
  totalWins,
  hoursPlayed,
  allstarClipCount,
  isPrivate,
  inventoryValue,
}: PlayerCardProps) {
  return (
    <div className="relative bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all duration-300 group">
      {/* Top accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-orange-500/0 via-orange-500/60 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-4">
        {/* Avatar + username */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Image
              src={avatar}
              alt={username}
              width={48}
              height={48}
              className="rounded-full border-2 border-gray-700 group-hover:border-orange-500/50 transition-colors"
            />
            {!isPrivate && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0d0d15]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-white hover:text-orange-400 transition-colors truncate block text-sm"
            >
              {username}
            </a>
            {isPrivate && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 text-[10px] font-medium rounded bg-gray-800 text-gray-500">
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Private
              </span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* K/D */}
          <div className="bg-[#0a0a0f] rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              K/D
            </p>
            {kdRatio !== null ? (
              <p className={`font-black text-lg ${kdColor(kdRatio)}`}>
                {kdRatio.toFixed(2)}
              </p>
            ) : (
              <p className="font-black text-lg text-gray-700">—</p>
            )}
          </div>

          {/* Wins */}
          <div className="bg-[#0a0a0f] rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Wins
            </p>
            {totalWins !== null ? (
              <p className="font-black text-lg text-orange-400">
                {totalWins.toLocaleString()}
              </p>
            ) : (
              <p className="font-black text-lg text-gray-700">—</p>
            )}
          </div>

          {/* Hours */}
          <div className="bg-[#0a0a0f] rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Hours
            </p>
            {hoursPlayed !== null ? (
              <p className="font-black text-lg text-blue-400">
                {hoursPlayed.toLocaleString()}
              </p>
            ) : (
              <p className="font-black text-lg text-gray-700">—</p>
            )}
          </div>

          {/* Allstar clips */}
          <div className="bg-[#0a0a0f] rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Clips
            </p>
            <p className="font-black text-lg text-purple-400">
              {allstarClipCount}
            </p>
          </div>

          {/* Inventory Value */}
          <div className="col-span-2 bg-[#0a0a0f] rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Inventory
            </p>
            {inventoryValue !== null ? (
              <p className="font-black text-lg text-green-400">
                ${inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            ) : (
              <p className="font-black text-lg text-gray-700">&mdash;</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
