export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_STEAM_IDS = new Set(["76561198089221644"]);
function isAdmin(steamId: string) {
  return ADMIN_STEAM_IDS.has(steamId);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.steamId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, steamId: true, username: true, avatar: true, balance: true },
    orderBy: { username: "asc" },
  });

  return NextResponse.json(users);
}
