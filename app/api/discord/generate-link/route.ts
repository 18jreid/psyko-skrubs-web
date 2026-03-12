export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.discordId) {
    return NextResponse.json({ error: "Discord already linked" }, { status: 400 });
  }

  // Generate a short, memorable code: 6 uppercase alphanumeric chars
  const code = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert — regenerate if they call again
  await prisma.discordLinkCode.upsert({
    where: { userId: user.id },
    update: { code, expiresAt },
    create: { id: crypto.randomUUID(), userId: user.id, code, expiresAt },
  });

  return NextResponse.json({ code, expiresAt: expiresAt.toISOString() });
}
