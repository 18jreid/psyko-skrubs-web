import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnedGames, SteamGame } from "@/lib/steam";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { steamId: true, id: true },
    });

    if (users.length === 0) {
      return NextResponse.json([]);
    }

    const ownedGamesResults = await Promise.all(
      users.map(async (user) => {
        const games = await getOwnedGames(user.steamId);
        return games;
      })
    );

    // Filter out null results (private profiles)
    const validResults = ownedGamesResults.filter(
      (r): r is SteamGame[] => r !== null
    );

    if (validResults.length === 0) {
      return NextResponse.json([]);
    }

    if (validResults.length === 1) {
      const sorted = validResults[0]
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 20);
      return NextResponse.json(sorted);
    }

    // Find intersection of all users' game libraries
    const firstUserGames = new Map<number, SteamGame>(
      validResults[0].map((g) => [g.appid, g])
    );

    for (let i = 1; i < validResults.length; i++) {
      const userGameIds = new Set(validResults[i].map((g) => g.appid));
      for (const [appid] of firstUserGames) {
        if (!userGameIds.has(appid)) {
          firstUserGames.delete(appid);
        }
      }
    }

    // Calculate average playtime across all users for common games
    const commonGames = Array.from(firstUserGames.values());

    const gamesWithAvgPlaytime = commonGames.map((game) => {
      const totalPlaytime = validResults.reduce((sum, userGames) => {
        const userGame = userGames.find((g) => g.appid === game.appid);
        return sum + (userGame?.playtime_forever || 0);
      }, 0);

      return {
        ...game,
        avg_playtime: Math.round(totalPlaytime / validResults.length),
        header_image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      };
    });

    // Sort by average playtime
    gamesWithAvgPlaytime.sort((a, b) => b.avg_playtime - a.avg_playtime);

    return NextResponse.json(gamesWithAvgPlaytime.slice(0, 20));
  } catch (error) {
    console.error("Error fetching common games:", error);
    return NextResponse.json(
      { error: "Failed to fetch common games" },
      { status: 500 }
    );
  }
}
