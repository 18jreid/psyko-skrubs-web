export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCS2Stats, getPlayerSummary } from "@/lib/steam";
import { getAllstarClips, getAllstarProfile } from "@/lib/allstar";
import PlayerCard from "@/components/PlayerCard";
import AllstarClipCard from "@/components/AllstarClipCard";

async function getPageData() {
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

    const steamIds = users.map((u) => u.steamId);

    const [playerData, allstarClips] = await Promise.all([
      Promise.all(
        users.map(async (user) => {
          const [stats, summary, allstarProfile] = await Promise.all([
            getCS2Stats(user.steamId),
            getPlayerSummary(user.steamId),
            getAllstarProfile(user.steamId),
          ]);
          return {
            ...user,
            username: summary?.personaname ?? user.username,
            avatar: summary?.avatarfull ?? user.avatar,
            stats,
            isPrivate: !stats,
            allstarClipCount: allstarProfile?.clipCount ?? 0,
          };
        })
      ),
      getAllstarClips(steamIds),
    ]);

    return { players: playerData, clips: allstarClips.slice(0, 12) };
  } catch {
    return { players: [], clips: [] };
  }
}

export default async function HomePage() {
  const { players, clips } = await getPageData();
  const hasPlayers = players.length > 0;

  return (
    <div className="min-h-screen">
      {/* Compact Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-900/10" />
        <div className="absolute top-10 left-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-xs font-medium tracking-wider uppercase mb-4">
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
            Counter-Strike 2
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3">
            <span className="text-white">PSYKO</span>{" "}
            <span className="text-orange-500">SKRUBS</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Where bad aim meets worse decision-making.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-16">
        {/* The Roster */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">
                The{" "}
                <span className="text-orange-500">Roster</span>
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {hasPlayers
                  ? `${players.length} player${players.length !== 1 ? "s" : ""} registered`
                  : "No players yet"}
              </p>
            </div>
            <Link
              href="/rankings"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-orange-500/30 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
            >
              Full Rankings
            </Link>
          </div>

          {hasPlayers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map((player) => (
                <PlayerCard
                  key={player.id}
                  username={player.username}
                  avatar={player.avatar}
                  profileUrl={player.profileUrl}
                  steamId={player.steamId}
                  kdRatio={player.stats?.kd_ratio ?? null}
                  totalWins={player.stats?.total_wins ?? null}
                  hoursPlayed={player.stats?.hours_played ?? null}
                  allstarClipCount={player.allstarClipCount}
                  isPrivate={player.isPrivate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#0d0d15] border border-gray-800 rounded-xl">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 font-semibold mb-2">No players yet</p>
              <p className="text-gray-600 text-sm mb-5">
                Sign in with Steam to join the roster
              </p>
              <a
                href="/api/auth/signin"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-sm"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 233 233"
                  fill="currentColor"
                >
                  <path d="M116.5 0C52.1 0 0 52.1 0 116.5S52.1 233 116.5 233 233 180.9 233 116.5 180.9 0 116.5 0zm0 24.6c50.7 0 91.9 41.2 91.9 91.9 0 50.7-41.2 91.9-91.9 91.9S24.6 167.2 24.6 116.5c0-50.7 41.2-91.9 91.9-91.9z" />
                </svg>
                Sign in with Steam
              </a>
            </div>
          )}
        </section>

        {/* Latest Clips */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">
                Latest{" "}
                <span className="text-orange-500">Clips</span>
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                CS2 highlights auto-pulled from Allstar.gg
              </p>
            </div>
            {clips.length > 0 && (
              <Link
                href="/clips"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition-colors"
              >
                View All
              </Link>
            )}
          </div>

          {clips.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {clips.map((clip) => (
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
              <div className="text-center mt-8">
                <Link
                  href="/clips"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0d0d15] hover:bg-gray-800 border border-gray-700 hover:border-orange-500/30 text-gray-300 hover:text-white font-medium rounded-xl transition-colors"
                >
                  See all clips
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-[#0d0d15] border border-gray-800 rounded-xl">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-600"
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
              <p className="text-gray-400 font-semibold mb-2">No clips yet</p>
              <p className="text-gray-600 text-sm">
                {hasPlayers
                  ? "Clips from Allstar.gg will appear here automatically once members record some."
                  : "Sign in with Steam and connect your Allstar account to see clips here."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
