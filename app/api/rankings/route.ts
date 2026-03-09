import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCS2Stats, getPlayerSummary } from "@/lib/steam";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        steamId: true,
        username: true,
        avatar: true,
        profileUrl: true,
      },
    });

    const rankingsPromises = users.map(async (user) => {
      const [stats, summary] = await Promise.all([
        getCS2Stats(user.steamId),
        getPlayerSummary(user.steamId),
      ]);

      return {
        ...user,
        username: summary?.personaname || user.username,
        avatar: summary?.avatarfull || user.avatar,
        stats,
        isPrivate: !stats,
      };
    });

    const rankings = await Promise.all(rankingsPromises);

    rankings.sort((a, b) => {
      if (a.isPrivate && !b.isPrivate) return 1;
      if (!a.isPrivate && b.isPrivate) return -1;
      if (!a.stats || !b.stats) return 0;
      return b.stats.kd_ratio - a.stats.kd_ratio;
    });

    return NextResponse.json(rankings);
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
