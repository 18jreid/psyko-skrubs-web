import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectPlatform } from "@/lib/steam";

export async function GET() {
  try {
    const clips = await prisma.clip.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            steamId: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clips);
  } catch (error) {
    console.error("Error fetching clips:", error);
    return NextResponse.json({ error: "Failed to fetch clips" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, url, description } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);

    const clip = await prisma.clip.create({
      data: {
        userId: session.user.id,
        title,
        url,
        platform,
        description: description || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            steamId: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    return NextResponse.json(clip, { status: 201 });
  } catch (error) {
    console.error("Error creating clip:", error);
    return NextResponse.json({ error: "Failed to create clip" }, { status: 500 });
  }
}
