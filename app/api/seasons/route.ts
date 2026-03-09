import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: "desc" },
      include: {
        snapshots: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          orderBy: { rank: "asc" },
        },
      },
    });
    return NextResponse.json(seasons);
  } catch {
    return NextResponse.json({ error: "Failed to fetch seasons" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Season name is required" }, { status: 400 });
  }

  // Deactivate any currently active seasons
  await prisma.season.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const season = await prisma.season.create({
    data: {
      id: randomUUID(),
      name: name.trim(),
      startDate: new Date(),
      isActive: true,
    },
  });

  return NextResponse.json(season, { status: 201 });
}
