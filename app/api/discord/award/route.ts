export const dynamic = "force-dynamic";

// Called by the Discord bot every 20 minutes for each user in voice
// Awards 100 coins, respects 500/day cap

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COINS_PER_INTERVAL = 100;
const DAILY_CAP = 500;
const INTERVAL_MINUTES = 20;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.BOT_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { discordIds } = await req.json() as { discordIds: string[] };
  if (!Array.isArray(discordIds) || discordIds.length === 0) {
    return NextResponse.json({ awarded: [] });
  }

  // Get all linked users for these Discord IDs
  const users = await prisma.user.findMany({
    where: { discordId: { in: discordIds } },
    select: { id: true, username: true, balance: true, discordId: true },
  });

  // Get today's earnings for each user
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const todayRewards = await prisma.voiceReward.groupBy({
    by: ["userId"],
    where: {
      userId: { in: users.map((u) => u.id) },
      awardedAt: { gte: todayStart },
    },
    _sum: { coins: true },
  });

  const earnedMap = new Map(todayRewards.map((r) => [r.userId, r._sum.coins ?? 0]));

  const awarded: { discordId: string; username: string; coins: number; newBalance: number; dailyTotal: number }[] = [];

  for (const user of users) {
    const alreadyEarned = earnedMap.get(user.id) ?? 0;
    if (alreadyEarned >= DAILY_CAP) continue;

    const coins = Math.min(COINS_PER_INTERVAL, DAILY_CAP - alreadyEarned);

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: coins } },
      }),
      prisma.voiceReward.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          coins,
          minutes: INTERVAL_MINUTES,
        },
      }),
    ]);

    awarded.push({
      discordId: user.discordId!,
      username: user.username,
      coins,
      newBalance: updatedUser.balance,
      dailyTotal: alreadyEarned + coins,
    });
  }

  return NextResponse.json({ awarded });
}
