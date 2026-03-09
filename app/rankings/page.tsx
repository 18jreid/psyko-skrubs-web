import { prisma } from "@/lib/prisma";
import { getCS2Stats, getPlayerSummary } from "@/lib/steam";
import RankingsTable from "@/components/RankingsTable";

async function getRankings() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        steamId: true,
        username: true,
        avatar: true,
        profileUrl: true,
      },
    });

    const rankingsPromises = users.map(async (user) => {
      const [stats, summary] = await Promise.all([
        getCS2Stats(user.steamId),
        getPlayerSummary(user.steamId),
      ]);

      return {
        ...user,
        username: summary?.personaname || user.username,
        avatar: summary?.avatarfull || user.avatar,
        stats,
        isPrivate: !stats,
      };
    });

    const rankings = await Promise.all(rankingsPromises);

    rankings.sort((a, b) => {
      if (a.isPrivate && !b.isPrivate) return 1;
      if (!a.isPrivate && b.isPrivate) return -1;
      if (!a.stats || !b.stats) return 0;
      return b.stats.kd_ratio - a.stats.kd_ratio;
    });

    return rankings;
  } catch {
    return [];
  }
}

export default async function RankingsPage() {
  const players = await getRankings();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-black text-white">
            CS2{" "}
            <span className="text-orange-500">Rankings</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Live stats fetched from Steam API — sorted by K/D ratio
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-start gap-3 p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm text-blue-400/80 mb-6">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Stats are pulled from the Steam Web API. Players with private
            profiles or hidden game details will show as private. Sign in with
            Steam to appear on the leaderboard.
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <RankingsTable initialPlayers={players} />
      </div>
    </div>
  );
}
