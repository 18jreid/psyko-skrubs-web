export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_STEAM_IDS = new Set(["76561198089221644"]);
function isAdmin(steamId: string) {
  return ADMIN_STEAM_IDS.has(steamId);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.steamId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, amount } = await req.json();
  if (!userId || typeof amount !== "number" || amount === 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { balance: { increment: amount } },
    select: { id: true, username: true, balance: true },
  });

  return NextResponse.json(user);
}
