import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const season = await prisma.season.findUnique({ where: { id } });
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });
  if (!season.isActive) return NextResponse.json({ error: "Season already archived" }, { status: 400 });

  // Snapshot current standings (users with ELO, sorted desc)
  const users = await prisma.user.findMany({
    where: { cs2Elo: { not: null } },
    orderBy: { cs2Elo: "desc" },
    select: { id: true, cs2Elo: true },
  });

  await prisma.$transaction([
    // Create snapshots
    ...users.map((u, i) =>
      prisma.seasonSnapshot.upsert({
        where: { seasonId_userId: { seasonId: id, userId: u.id } },
        create: { id: randomUUID(), seasonId: id, userId: u.id, cs2Elo: u.cs2Elo, rank: i + 1 },
        update: { cs2Elo: u.cs2Elo, rank: i + 1 },
      })
    ),
    // Mark season as ended
    prisma.season.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
