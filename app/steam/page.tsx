export const dynamic = "force-dynamic";

import Image from "next/image";
import { getRecentlyPlayedGames } from "@/lib/steam";
import type { SteamPlayerSummary, RecentGame } from "@/lib/steam";

const STEAM_API_KEY = process.env.STEAM_API_KEY || "";

const MEMBER_IDS = [
  "76561199407891662",
  "76561199406379718",
  "76561198343482516",
  "76561198054897590",
  "76561198086645266",
  "76561198086528894",
  "76561198068597714",
  "76561197973063754",
  "76561198090034242",
  "76561198095332890",
  "76561198089221644",
];

const STATE_LABEL: Record<number, string> = {
  0: "Offline",
  1: "Online",
  2: "Busy",
  3: "Away",
  4: "Snooze",
  5: "Looking to Trade",
  6: "Looking to Play",
};

function statusColor(state: number, inGame?: string) {
  if (inGame) return "bg-green-400";
  if (state === 1) return "bg-green-400";
  if (state === 2 || state === 3 || state === 4) return "bg-yellow-400";
  return "bg-gray-600";
}

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function gameIconUrl(appid: number, iconHash: string) {
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`;
}

interface MemberData {
  player: SteamPlayerSummary;
  recentGames: RecentGame[] | null;
}

async function getSteamPageData(): Promise<MemberData[]> {
  const ids = MEMBER_IDS.join(",");
  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${ids}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const players: SteamPlayerSummary[] = data?.response?.players ?? [];
  const playerMap = new Map(players.map((p) => [p.steamid, p]));
  const ordered = MEMBER_IDS.map((id) => playerMap.get(id)).filter(Boolean) as SteamPlayerSummary[];

  return Promise.all(
    ordered.map(async (player) => ({
      player,
      recentGames: player.communityvisibilitystate === 3
        ? await getRecentlyPlayedGames(player.steamid)
        : null,
    }))
  );
}

export default async function SteamPage() {
  const members = await getSteamPageData();

  const online = members.filter((m) => m.player.personastate > 0 || m.player.gameextrainfo);
  const inGame = members.filter((m) => m.player.gameextrainfo);
  const offline = members.filter((m) => m.player.personastate === 0 && !m.player.gameextrainfo);

  // Aggregate top games across all members (by total playtime_2weeks)
  const gameMap = new Map<number, { name: string; icon: string; totalMinutes: number; players: string[] }>();
  for (const { player, recentGames } of members) {
    if (!recentGames) continue;
    for (const g of recentGames) {
      const existing = gameMap.get(g.appid);
      if (existing) {
        existing.totalMinutes += g.playtime_2weeks;
        existing.players.push(player.personaname);
      } else {
        gameMap.set(g.appid, {
          name: g.name,
          icon: g.img_icon_url,
          totalMinutes: g.playtime_2weeks,
          players: [player.personaname],
        });
      }
    }
  }
  const topGames = [...gameMap.entries()]
    .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
    .slice(0, 8);

  // Sort members: in-game first, then online, then offline
  const sortedMembers = [
    ...members.filter((m) => m.player.gameextrainfo),
    ...members.filter((m) => !m.player.gameextrainfo && m.player.personastate > 0),
    ...members.filter((m) => m.player.personastate === 0 && !m.player.gameextrainfo),
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-black text-white">
            Steam <span className="text-orange-500">Activity</span>
          </h1>
          <p className="text-gray-500 mt-1">Live status and recent playtime for all {members.length} members</p>
          <div className="flex items-center gap-4 mt-4">
            <Pill color="green" label={`${inGame.length} in-game`} />
            <Pill color="blue" label={`${online.length} online`} />
            <Pill color="gray" label={`${offline.length} offline`} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* Top Games This Fortnight */}
        {topGames.length > 0 && (
          <section>
            <h2 className="text-xl font-black text-white mb-4">
              Top Games <span className="text-orange-500">This Fortnight</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {topGames.map(([appid, game]) => (
                <a
                  key={appid}
                  href={`https://store.steampowered.com/app/${appid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-[#0d0d15] border border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all"
                >
                  <img
                    src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`}
                    alt={game.name}
                    className="w-full aspect-[460/215] object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                      {game.name}
                    </p>
                    <p className="text-[10px] text-orange-400 font-semibold mt-0.5">
                      {Math.round(game.totalMinutes / 60)}h across group
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {game.players.length} player{game.players.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Member Activity */}
        <section>
          <h2 className="text-xl font-black text-white mb-4">
            Member <span className="text-orange-500">Activity</span>
          </h2>
          <div className="space-y-3">
            {sortedMembers.map(({ player, recentGames }) => {
              const isOnline = player.personastate > 0 || !!player.gameextrainfo;
              const isPublic = player.communityvisibilitystate === 3;
              return (
                <div
                  key={player.steamid}
                  className="bg-[#0d0d15] border border-gray-800 rounded-2xl p-4 hover:border-orange-500/20 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Image
                        src={player.avatarfull}
                        alt={player.personaname}
                        width={48}
                        height={48}
                        className={`rounded-xl border-2 transition-colors ${isOnline ? "border-orange-500/40" : "border-gray-700"}`}
                      />
                      <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0d0d15] ${statusColor(player.personastate, player.gameextrainfo)}`} />
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <a
                        href={player.profileurl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-black text-white hover:text-orange-400 transition-colors truncate block"
                      >
                        {player.personaname}
                      </a>
                      <p className={`text-xs mt-0.5 ${player.gameextrainfo ? "text-green-400 font-semibold" : isOnline ? "text-green-400" : "text-gray-600"}`}>
                        {player.gameextrainfo
                          ? `Playing ${player.gameextrainfo}`
                          : STATE_LABEL[player.personastate] ?? "Offline"}
                        {!isOnline && player.lastlogoff
                          ? ` · last seen ${timeAgo(player.lastlogoff)}`
                          : ""}
                      </p>
                    </div>

                    {/* Currently playing badge */}
                    {player.gameextrainfo && player.gameid && (
                      <a
                        href={`https://store.steampowered.com/app/${player.gameid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 hidden sm:block"
                      >
                        <img
                          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${player.gameid}/header.jpg`}
                          alt={player.gameextrainfo}
                          className="h-12 rounded-lg border border-green-500/30"
                        />
                      </a>
                    )}
                  </div>

                  {/* Recent games */}
                  {isPublic && recentGames && recentGames.length > 0 ? (
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Recent — last 2 weeks</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {recentGames.map((g) => (
                          <a
                            key={g.appid}
                            href={`https://store.steampowered.com/app/${g.appid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 group/game flex items-center gap-2 bg-[#0a0a0f] border border-gray-800/60 rounded-lg px-2.5 py-1.5 hover:border-orange-500/30 transition-colors"
                          >
                            <img
                              src={gameIconUrl(g.appid, g.img_icon_url)}
                              alt={g.name}
                              className="w-6 h-6 rounded"
                            />
                            <div>
                              <p className="text-xs font-semibold text-gray-300 group-hover/game:text-white transition-colors whitespace-nowrap max-w-[100px] truncate">
                                {g.name}
                              </p>
                              <p className="text-[10px] text-orange-400 font-bold">
                                {Math.round(g.playtime_2weeks / 60)}h this week
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : !isPublic ? (
                    <p className="text-xs text-gray-700 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Private profile
                    </p>
                  ) : (
                    <p className="text-xs text-gray-700">No recent activity</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Pill({ color, label }: { color: "green" | "blue" | "gray"; label: string }) {
  const dot = color === "green" ? "bg-green-400" : color === "blue" ? "bg-blue-400" : "bg-gray-600";
  const text = color === "green" ? "text-green-400" : color === "blue" ? "text-blue-400" : "text-gray-500";
  const bg = color === "green" ? "bg-green-500/10 border-green-500/20" : color === "blue" ? "bg-blue-500/10 border-blue-500/20" : "bg-gray-800 border-gray-700";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
