export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.BOT_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const discordId = req.nextUrl.searchParams.get("discordId");
  if (!discordId) return NextResponse.json({ linked: false });

  const user = await prisma.user.findUnique({
    where: { discordId },
    select: { id: true, username: true, balance: true },
  });
  if (!user) return NextResponse.json({ linked: false });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const todaySum = await prisma.voiceReward.aggregate({
    where: { userId: user.id, awardedAt: { gte: todayStart } },
    _sum: { coins: true },
  });

  return NextResponse.json({
    linked: true,
    username: user.username,
    balance: user.balance,
    todayEarned: todaySum._sum.coins ?? 0,
  });
}
