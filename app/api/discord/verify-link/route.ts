export const dynamic = "force-dynamic";

// Called by the Discord bot when a user runs /link <code>
// Secured by a shared BOT_SECRET env var

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.BOT_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { discordId, discordUsername, code } = await req.json();
  if (!discordId || !code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Check the code exists and hasn't expired
  const linkCode = await prisma.discordLinkCode.findUnique({ where: { code } });
  if (!linkCode) return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  if (new Date() > linkCode.expiresAt) {
    return NextResponse.json({ error: "Code expired" }, { status: 410 });
  }

  // Check this Discord account isn't already linked to someone else
  const existing = await prisma.user.findUnique({ where: { discordId } });
  if (existing && existing.id !== linkCode.userId) {
    return NextResponse.json({ error: "Discord account already linked to another user" }, { status: 409 });
  }

  // Link and clean up code
  await prisma.$transaction([
    prisma.user.update({
      where: { id: linkCode.userId },
      data: { discordId },
    }),
    prisma.discordLinkCode.delete({ where: { id: linkCode.id } }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: linkCode.userId } });
  return NextResponse.json({ success: true, username: user?.username });
}
