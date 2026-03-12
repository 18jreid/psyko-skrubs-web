export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([]);

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json([]);

  const items = await prisma.userItem.findMany({
    where: { userId: user.id, sold: false },
    include: { item: true },
    orderBy: { obtainedAt: "desc" },
  });

  return NextResponse.json(
    items.map((ui) => ({
      id: ui.id,
      obtainedAt: ui.obtainedAt.toISOString(),
      float: ui.float ?? null,
      item: ui.item,
    }))
  );
}
