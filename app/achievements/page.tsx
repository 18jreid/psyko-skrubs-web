export const dynamic = "force-dynamic";

import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCS2Stats } from "@/lib/steam";
import { randomUUID } from "crypto";

const ACHIEVEMENT_ICONS: Record<string, string> = {
  kd_1: "🎯",
  kd_1_5: "🔥",
  kd_2: "💀",
  wins_100: "🏆",
  wins_500: "🥇",
  wins_1000: "👑",
  hours_100: "⏱️",
  hours_500: "🕹️",
  hours_1000: "🎮",
};

function getIcon(type: string) {
  const key = type.replace(".", "_");
  return ACHIEVEMENT_ICONS[key] ?? "⭐";
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const KD_MILESTONES = [1.0, 1.5, 2.0];
const WINS_MILESTONES = [100, 500, 1000];
const HOURS_MILESTONES = [100, 500, 1000];

async function checkAndGetAchievements() {
  // Run milestone check in background
  try {
    const users = await prisma.user.findMany({ select: { id: true, steamId: true, username: true } });
    await Promise.all(users.map(async (user) => {
      const stats = await getCS2Stats(user.steamId);
      if (!stats) return;
      const checks = [
        ...KD_MILESTONES.filter((t) => stats.kd_ratio >= t).map((t) => ({ type: `kd_${t}`, value: stats.kd_ratio, msg: `Reached ${t.toFixed(1)} K/D ratio in CS2` })),
        ...WINS_MILESTONES.filter((t) => stats.total_wins >= t).map((t) => ({ type: `wins_${t}`, value: stats.total_wins, msg: `Hit ${t.toLocaleString()} total wins in CS2` })),
        ...HOURS_MILESTONES.filter((t) => stats.hours_played >= t).map((t) => ({ type: `hours_${t}`, value: stats.hours_played, msg: `Logged ${t.toLocaleString()} hours in CS2` })),
      ];
      for (const c of checks) {
        try {
          await prisma.achievement.create({ data: { id: randomUUID(), userId: user.id, type: c.type, value: c.value } });
          await prisma.notification.create({ data: { id: randomUUID(), userId: user.id, type: "achievement", message: c.msg, refId: `${user.id}_${c.type}` } });
        } catch { /* already exists */ }
      }
    }));
  } catch { /* non-fatal */ }

  const achievements = await prisma.achievement.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });
  return achievements.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
}

async function getAchievements() {
  return checkAndGetAchievements();
}

export default async function AchievementsPage() {
  const achievements = await getAchievements();

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-black text-white">
            Achievement <span className="text-orange-500">Feed</span>
          </h1>
          <p className="text-gray-500 mt-1">CS2 milestones reached by the squad</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {achievements.length === 0 ? (
          <div className="text-center py-20 bg-[#0d0d15] border border-gray-800 rounded-2xl">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-gray-400 font-semibold mb-2">No achievements yet</p>
            <p className="text-gray-600 text-sm">Milestones will appear here as members reach them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {achievements.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-4 bg-[#0d0d15] border border-gray-800 rounded-2xl p-4 hover:border-orange-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl shrink-0">
                  {getIcon(a.type)}
                </div>
                <Image
                  src={a.user.avatar}
                  alt={a.user.username}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-gray-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white">{a.user.username}</p>
                  <p className="text-sm text-gray-400">{getAchievementLabel(a.type, a.value)}</p>
                </div>
                <span className="text-xs text-gray-600 shrink-0">{relativeDate(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getAchievementLabel(type: string, value: number): string {
  if (type.startsWith("kd_")) {
    const threshold = parseFloat(type.replace("kd_", ""));
    return `Reached ${threshold.toFixed(1)} K/D ratio (currently ${value.toFixed(2)})`;
  }
  if (type.startsWith("wins_")) {
    const threshold = parseInt(type.replace("wins_", ""));
    return `Hit ${threshold.toLocaleString()} total wins in CS2`;
  }
  if (type.startsWith("hours_")) {
    const threshold = parseInt(type.replace("hours_", ""));
    return `Logged ${threshold.toLocaleString()} hours in CS2`;
  }
  return type;
}
