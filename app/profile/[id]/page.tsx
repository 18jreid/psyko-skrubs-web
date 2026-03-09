export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCS2Stats, getPlayerSummary } from "@/lib/steam";
import { getAllstarProfile } from "@/lib/allstar";
import type { AllstarClipWithUser } from "@/lib/allstar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import ClipsSection from "./ClipsSection";

function eloTier(elo: number): { label: string; color: string } {
  if (elo >= 30000) return { label: "Global Elite", color: "text-cyan-300" };
  if (elo >= 25000) return { label: "Supreme", color: "text-red-400" };
  if (elo >= 20000) return { label: "Legendary Eagle", color: "text-purple-400" };
  if (elo >= 15000) return { label: "Master Guardian", color: "text-blue-400" };
  if (elo >= 10000) return { label: "Gold Nova", color: "text-yellow-400" };
  if (elo >= 5000) return { label: "Silver", color: "text-gray-400" };
  return { label: "Unranked", color: "text-gray-600" };
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-[#0a0a0f] rounded-xl p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-black ${highlight ? "text-orange-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) notFound();

  const [stats, summary, allstarProfile, session] = await Promise.all([
    getCS2Stats(user.steamId),
    getPlayerSummary(user.steamId),
    getAllstarProfile(user.steamId),
    getServerSession(authOptions),
  ]);

  const isLoggedIn = !!session;

  // Build AllstarClipWithUser array from the profile
  const allstarClips: AllstarClipWithUser[] = (allstarProfile?.clips ?? []).map((clip) => ({
    ...clip,
    username: allstarProfile?.username ?? user.username,
    userAvatar: allstarProfile?.avatarUrl ?? user.avatar,
    steamId: user.steamId,
  }));

  // Fetch vote data for these clips
  let voteMap: Record<string, { score: number; userVote: number }> = {};
  if (allstarClips.length > 0) {
    const shareIds = allstarClips.map((c) => c.shareId);
    const votes = await prisma.clipVote.groupBy({
      by: ["shareId"],
      where: { shareId: { in: shareIds } },
      _sum: { value: true },
    });
    const myVotes = isLoggedIn
      ? await prisma.clipVote.findMany({
          where: { userId: session.user.id, shareId: { in: shareIds } },
          select: { shareId: true, value: true },
        })
      : [];
    const myVoteMap: Record<string, number> = {};
    for (const v of myVotes) myVoteMap[v.shareId] = v.value;
    for (const v of votes) {
      voteMap[v.shareId] = {
        score: v._sum.value ?? 0,
        userVote: myVoteMap[v.shareId] ?? 0,
      };
    }
  }

  const displayName = summary?.personaname || user.username;
  const avatar = summary?.avatarfull || user.avatar;
  const tier = user.cs2Elo != null ? eloTier(user.cs2Elo) : null;

  const memberSince = new Date(user.createdAt).toLocaleDateString([], {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen">
      {/* Profile header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Image
              src={avatar}
              alt={displayName}
              width={96}
              height={96}
              className="rounded-2xl border-2 border-orange-500/30 shrink-0"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-black text-white">{displayName}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                {tier && (
                  <span className={`text-sm font-bold ${tier.color}`}>
                    {tier.label} — {user.cs2Elo?.toLocaleString()} ELO
                  </span>
                )}
                <a
                  href={user.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
                  </svg>
                  Steam Profile
                </a>
                <span className="text-xs text-gray-600">Member since {memberSince}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* CS2 Stats */}
        <section>
          <h2 className="text-lg font-black text-white mb-4">CS2 Stats</h2>
          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <StatBox label="K/D Ratio" value={stats.kd_ratio.toFixed(2)} highlight />
              <StatBox label="Kills" value={stats.total_kills.toLocaleString()} />
              <StatBox label="Deaths" value={stats.total_deaths.toLocaleString()} />
              <StatBox label="Wins" value={stats.total_wins.toLocaleString()} />
              <StatBox label="Hours" value={`${stats.hours_played.toLocaleString()}h`} />
            </div>
          ) : (
            <div className="bg-[#0d0d15] border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
              Stats unavailable — profile may be private.
            </div>
          )}
        </section>

        {/* Premier ELO */}
        {user.cs2Elo != null && tier && (
          <section>
            <h2 className="text-lg font-black text-white mb-4">Premier Rating</h2>
            <div className="bg-[#0d0d15] border border-gray-800 rounded-xl p-5 flex items-center gap-4">
              <div className={`text-4xl font-black ${tier.color}`}>{user.cs2Elo.toLocaleString()}</div>
              <div>
                <p className={`font-bold ${tier.color}`}>{tier.label}</p>
                <p className="text-xs text-gray-500">Self-reported Premier ELO</p>
              </div>
            </div>
          </section>
        )}

        {/* Allstar Clips */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">Allstar Clips</h2>
            <a
              href={`https://allstar.gg/profile?user=${user.steamId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              Allstar profile →
            </a>
          </div>
          <ClipsSection clips={allstarClips} voteMap={voteMap} isLoggedIn={isLoggedIn} />
        </section>
      </div>
    </div>
  );
}
