export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.BOT_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const rewards = await prisma.voiceReward.groupBy({
    by: ["userId"],
    where: { awardedAt: { gte: todayStart } },
    _sum: { coins: true },
    orderBy: { _sum: { coins: "desc" } },
    take: 10,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: rewards.map((r) => r.userId) } },
    select: { id: true, username: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u.username]));
  const entries = rewards.map((r) => ({
    username: userMap.get(r.userId) ?? "Unknown",
    coins: r._sum.coins ?? 0,
  }));

  return NextResponse.json({ entries });
}
