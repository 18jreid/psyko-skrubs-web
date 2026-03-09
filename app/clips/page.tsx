export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getPlayerSummary as getSteamSummary } from "@/lib/steam";
import { getAllstarClips as fetchAllstarClips } from "@/lib/allstar";
import ClipsFilterBar from "@/components/ClipsFilterBar";

async function getClipsData() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, steamId: true, username: true, avatar: true },
    });

    const steamIds = users.map((u) => u.steamId);

    // Enrich with Steam avatars then fetch Allstar clips
    const [summaries, clips] = await Promise.all([
      Promise.all(users.map((u) => getSteamSummary(u.steamId))),
      fetchAllstarClips(steamIds),
    ]);

    // Build a map of steamId -> Steam display name & avatar for enriching clip cards
    const steamMap: Record<string, { username: string; avatar: string }> = {};
    users.forEach((u, i) => {
      steamMap[u.steamId] = {
        username: summaries[i]?.personaname ?? u.username,
        avatar: summaries[i]?.avatarfull ?? u.avatar,
      };
    });

    // Enrich clip usernames/avatars with Steam data (Allstar usernames can differ)
    const enriched = clips.map((clip) => {
      const steam = steamMap[clip.steamId];
      return {
        ...clip,
        username: steam?.username ?? clip.username,
        userAvatar: steam?.avatar ?? clip.userAvatar,
      };
    });

    return { clips: enriched, totalCount: enriched.length };
  } catch {
    return { clips: [], totalCount: 0 };
  }
}

export default async function ClipsPage() {
  const { clips, totalCount } = await getClipsData();

  const players = Array.from(
    new Map(clips.map((c) => [c.username, { username: c.username, userAvatar: c.userAvatar }])).values()
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-white">
                Clips{" "}
                <span className="text-orange-500">Gallery</span>
              </h1>
              <p className="text-gray-500 mt-1">
                {totalCount > 0
                  ? `${totalCount} clip${totalCount !== 1 ? "s" : ""} from Allstar.gg`
                  : "No clips yet"}
              </p>
            </div>

            {/* Allstar badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-medium self-start sm:self-auto">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Powered by Allstar.gg
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {clips.length > 0 ? (
          <ClipsFilterBar clips={clips} players={players} />
        ) : (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-[#0d0d15] border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-gray-600"
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
            <h3 className="text-2xl font-black text-gray-400 mb-3">
              No clips yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed">
              Clips appear here automatically once group members record highlights
              on{" "}
              <a
                href="https://allstar.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 transition-colors"
              >
                Allstar.gg
              </a>{" "}
              using the same Steam account.
            </p>

            {/* How it works */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              {[
                {
                  step: "1",
                  title: "Sign in with Steam",
                  desc: "Join the roster by signing into the site with your Steam account.",
                },
                {
                  step: "2",
                  title: "Install Allstar",
                  desc: "Download the Allstar desktop app and link your Steam profile.",
                },
                {
                  step: "3",
                  title: "Play & record",
                  desc: "Your highlights auto-upload and appear here within minutes.",
                },
              ].map(({ step, title, desc }) => (
                <div
                  key={step}
                  className="bg-[#0d0d15] border border-gray-800 rounded-xl p-4"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-black text-sm mb-3">
                    {step}
                  </div>
                  <p className="font-semibold text-white text-sm mb-1">{title}</p>
                  <p className="text-gray-600 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
