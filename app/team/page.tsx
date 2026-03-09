export const dynamic = "force-dynamic";

import Image from "next/image";
import { getCS2Stats } from "@/lib/steam";

const STEAM_API_KEY = process.env.STEAM_API_KEY || "";

const MEMBER_IDS = [
  "76561199407891662", // big pooch (bighoochiepoochie)
  "76561199406379718", // buckethatrango
  "76561198343482516", // DoorTrim
  "76561198054897590", // Kaiser Mikael (kaiser_mikael)
  "76561198086645266", // Koba (ChasePete99)
  "76561198086528894", // ogblowfish
  "76561198068597714", // osteoporosis
  "76561197973063754", // SpartanPI
  "76561198090034242", // sudo
  "76561198095332890", // Чебурашка
  "76561198089221644", // GoldMember (Goldmember527)
];

interface SteamPlayer {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
  personastate: number;
  communityvisibilitystate: number;
  gameextrainfo?: string;
}

const STATE_LABEL: Record<number, string> = {
  0: "Offline",
  1: "Online",
  2: "Busy",
  3: "Away",
  4: "Snooze",
  5: "Looking to Trade",
  6: "Looking to Play",
};

function statusColor(state: number, inGame?: string): string {
  if (inGame) return "bg-green-400";
  if (state === 1) return "bg-green-400";
  if (state === 2 || state === 3 || state === 4) return "bg-yellow-400";
  return "bg-gray-600";
}

function statusLabel(state: number, inGame?: string): string {
  if (inGame) return `In-Game: ${inGame}`;
  return STATE_LABEL[state] ?? "Offline";
}

function kdColor(kd: number): string {
  if (kd >= 1.5) return "text-green-400";
  if (kd >= 1.0) return "text-yellow-400";
  return "text-red-400";
}

async function getTeamData() {
  const ids = MEMBER_IDS.join(",");
  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${ids}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const players: SteamPlayer[] = data?.response?.players ?? [];

  // Preserve the order of MEMBER_IDS
  const playerMap = new Map(players.map((p) => [p.steamid, p]));
  const ordered = MEMBER_IDS.map((id) => playerMap.get(id)).filter(Boolean) as SteamPlayer[];

  // Fetch CS2 stats for each member in parallel
  const withStats = await Promise.all(
    ordered.map(async (player) => {
      const stats = await getCS2Stats(player.steamid);
      return { ...player, stats };
    })
  );

  return withStats;
}

export default async function TeamPage() {
  const members = await getTeamData();

  const onlineCount = members.filter((m) => m.personastate > 0 || m.gameextrainfo).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-white">
              The <span className="text-orange-500">Roster</span>
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs font-bold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {onlineCount} online
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            {members.length} members · Live status from Steam
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const isPublic = member.communityvisibilitystate === 3;
            const online = member.personastate > 0 || !!member.gameextrainfo;
            return (
              <a
                key={member.steamid}
                href={member.profileurl}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[#0d0d15] border border-gray-800 rounded-2xl p-5 hover:border-orange-500/30 hover:bg-[#0f0f1a] transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar with status dot */}
                  <div className="relative shrink-0">
                    <Image
                      src={member.avatarfull}
                      alt={member.personaname}
                      width={64}
                      height={64}
                      className={`rounded-xl border-2 transition-colors ${online ? "border-orange-500/40 group-hover:border-orange-500/70" : "border-gray-700"}`}
                    />
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0d0d15] ${statusColor(member.personastate, member.gameextrainfo)}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-lg leading-tight truncate group-hover:text-orange-400 transition-colors">
                      {member.personaname}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${member.gameextrainfo ? "text-green-400" : online ? "text-green-400" : "text-gray-600"}`}>
                      {statusLabel(member.personastate, member.gameextrainfo)}
                    </p>
                  </div>

                  {/* Steam arrow */}
                  <svg className="w-4 h-4 text-gray-700 group-hover:text-orange-500 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>

                {/* CS2 Stats */}
                {isPublic && member.stats ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatBox label="K/D" value={member.stats.kd_ratio.toFixed(2)} valueClass={kdColor(member.stats.kd_ratio)} />
                    <StatBox label="Hours" value={`${member.stats.hours_played.toLocaleString()}h`} />
                    <StatBox label="Wins" value={member.stats.total_wins.toLocaleString()} />
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Private profile
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-[#0a0a0f] rounded-lg p-2 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-black ${valueClass ?? "text-white"}`}>{value}</p>
    </div>
  );
}
