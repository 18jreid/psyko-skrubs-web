export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ui = await prisma.userItem.findFirst({
    where: { id, userId: user.id },
    include: { item: true },
  });
  if (!ui) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: ui.id,
    obtainedAt: ui.obtainedAt.toISOString(),
    sold: ui.sold,
    float: ui.float ?? null,
    item: ui.item,
  });
}
