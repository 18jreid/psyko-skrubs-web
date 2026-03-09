import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSteamHeaderImage } from "@/lib/steam";

export async function GET() {
  try {
    const requests = await prisma.gameRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            steamId: true,
          },
        },
        votes: {
          select: {
            userId: true,
            value: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const requestsWithScore = requests.map((r) => ({
      ...r,
      score: r.votes.reduce((sum, v) => sum + v.value, 0),
    }));

    requestsWithScore.sort((a, b) => b.score - a.score);

    return NextResponse.json(requestsWithScore);
  } catch (error) {
    console.error("Error fetching game requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch game requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { steamAppId, gameName, description } = body;

    if (!steamAppId || !gameName) {
      return NextResponse.json(
        { error: "Steam App ID and game name are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.gameRequest.findFirst({
      where: { steamAppId: String(steamAppId) },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This game has already been requested" },
        { status: 409 }
      );
    }

    const headerImage = getSteamHeaderImage(String(steamAppId));

    const gameRequest = await prisma.gameRequest.create({
      data: {
        userId: session.user.id,
        steamAppId: String(steamAppId),
        gameName,
        headerImage,
        description: description || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        votes: true,
      },
    });

    return NextResponse.json(gameRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating game request:", error);
    return NextResponse.json(
      { error: "Failed to create game request" },
      { status: 500 }
    );
  }
}
