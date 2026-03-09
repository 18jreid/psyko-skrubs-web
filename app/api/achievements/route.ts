import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    return NextResponse.json(
      achievements.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
