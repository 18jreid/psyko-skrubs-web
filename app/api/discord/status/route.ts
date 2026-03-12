export const dynamic = "force-dynamic";

// Returns Discord link status + recent earnings for the profile page

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ linked: false });

  const user = await prisma.user.findUnique({
    where: { steamId: session.user.steamId },
    select: { id: true, discordId: true },
  });
  if (!user) return NextResponse.json({ linked: false });

  // Today's earnings
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [todaySum, recentRewards] = await Promise.all([
    prisma.voiceReward.aggregate({
      where: { userId: user.id, awardedAt: { gte: todayStart } },
      _sum: { coins: true },
    }),
    prisma.voiceReward.findMany({
      where: { userId: user.id },
      orderBy: { awardedAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    linked: !!user.discordId,
    discordId: user.discordId,
    todayEarned: todaySum._sum.coins ?? 0,
    dailyCap: 500,
    recentRewards: recentRewards.map((r) => ({
      coins: r.coins,
      minutes: r.minutes,
      awardedAt: r.awardedAt.toISOString(),
    })),
  });
}
