export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCS2Stats, getPlayerSummary } from "@/lib/steam";
import RankingsTable from "@/components/RankingsTable";

async function getRankings() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, steamId: true, username: true, avatar: true, profileUrl: true, cs2Elo: true },
    });

    const players = await Promise.all(
      users.map(async (user) => {
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
      })
    );

    players.sort((a, b) => {
      if (a.isPrivate && !b.isPrivate) return 1;
      if (!a.isPrivate && b.isPrivate) return -1;
      const aElo = a.cs2Elo ?? -1;
      const bElo = b.cs2Elo ?? -1;
      if (bElo !== aElo) return bElo - aElo;
      if (!a.stats || !b.stats) return 0;
      return b.stats.kd_ratio - a.stats.kd_ratio;
    });

    return players;
  } catch {
    return [];
  }
}

async function getSeasons() {
  try {
    return await prisma.season.findMany({
      orderBy: { startDate: "desc" },
      include: {
        snapshots: {
          orderBy: { rank: "asc" },
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });
  } catch {
    return [];
  }
}

export default async function RankingsPage() {
  const [players, seasons] = await Promise.all([getRankings(), getSeasons()]);

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-black text-white">
            CS2 <span className="text-orange-500">Leaderboard</span>
          </h1>
          <p className="text-gray-500 mt-1">Ranked by Premier ELO — set yours to climb the board</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12">
        <RankingsTable initialPlayers={players} seasons={seasons} />
      </div>
    </div>
  );
}
