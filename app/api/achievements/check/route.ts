import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCS2Stats } from "@/lib/steam";
import { randomUUID } from "crypto";

const KD_MILESTONES = [1.0, 1.5, 2.0];
const WINS_MILESTONES = [100, 500, 1000];
const HOURS_MILESTONES = [100, 500, 1000];

const ACHIEVEMENT_LABELS: Record<string, (v: number) => string> = {
  kd: (v) => `Reached ${v.toFixed(1)} K/D ratio in CS2`,
  wins: (v) => `Hit ${v.toLocaleString()} total wins in CS2`,
  hours: (v) => `Logged ${v.toLocaleString()} hours in CS2`,
};

export async function POST() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, steamId: true },
    });

    const newAchievements: { userId: string; type: string; value: number; label: string }[] = [];

    await Promise.all(
      users.map(async (user) => {
        const stats = await getCS2Stats(user.steamId);
        if (!stats) return;

        // Check K/D milestones
        for (const threshold of KD_MILESTONES) {
          if (stats.kd_ratio >= threshold) {
            newAchievements.push({ userId: user.id, type: `kd_${threshold}`, value: stats.kd_ratio, label: ACHIEVEMENT_LABELS.kd(threshold) });
          }
        }
        // Check wins milestones
        for (const threshold of WINS_MILESTONES) {
          if (stats.total_wins >= threshold) {
            newAchievements.push({ userId: user.id, type: `wins_${threshold}`, value: stats.total_wins, label: ACHIEVEMENT_LABELS.wins(threshold) });
          }
        }
        // Check hours milestones
        for (const threshold of HOURS_MILESTONES) {
          if (stats.hours_played >= threshold) {
            newAchievements.push({ userId: user.id, type: `hours_${threshold}`, value: stats.hours_played, label: ACHIEVEMENT_LABELS.hours(threshold) });
          }
        }
      })
    );

    // Insert only new ones (skip duplicates via @@unique)
    const created: { userId: string; type: string }[] = [];
    for (const a of newAchievements) {
      try {
        await prisma.achievement.create({
          data: { id: randomUUID(), userId: a.userId, type: a.type, value: a.value },
        });
        created.push({ userId: a.userId, type: a.type });

        // Fan out notification
        await prisma.notification.create({
          data: {
            id: randomUUID(),
            userId: a.userId,
            type: "achievement",
            message: a.label,
            refId: `${a.userId}_${a.type}`,
          },
        });
      } catch {
        // Unique constraint — already exists, skip
      }
    }

    return NextResponse.json({ checked: users.length, newAchievements: created.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to check achievements" }, { status: 500 });
  }
}
