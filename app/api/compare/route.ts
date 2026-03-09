import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCS2Stats, getPlayerSummary } from "@/lib/steam";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const aId = searchParams.get("a");
  const bId = searchParams.get("b");

  if (!aId || !bId) {
    return NextResponse.json({ error: "Provide ?a=userId&b=userId" }, { status: 400 });
  }

  try {
    const [userA, userB] = await Promise.all([
      prisma.user.findUnique({ where: { id: aId }, select: { id: true, username: true, avatar: true, steamId: true, cs2Elo: true } }),
      prisma.user.findUnique({ where: { id: bId }, select: { id: true, username: true, avatar: true, steamId: true, cs2Elo: true } }),
    ]);

    if (!userA || !userB) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [statsA, statsB, summaryA, summaryB] = await Promise.all([
      getCS2Stats(userA.steamId),
      getCS2Stats(userB.steamId),
      getPlayerSummary(userA.steamId),
      getPlayerSummary(userB.steamId),
    ]);

    return NextResponse.json({
      a: { ...userA, username: summaryA?.personaname ?? userA.username, avatar: summaryA?.avatarfull ?? userA.avatar, stats: statsA },
      b: { ...userB, username: summaryB?.personaname ?? userB.username, avatar: summaryB?.avatarfull ?? userB.avatar, stats: statsB },
    });
  } catch {
    return NextResponse.json({ error: "Failed to compare" }, { status: 500 });
  }
}
