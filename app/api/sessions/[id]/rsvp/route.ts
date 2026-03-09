import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const { status } = await req.json();

  if (!["in", "out", "maybe"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const exists = await prisma.gamingSession.findUnique({ where: { id: sessionId } });
  if (!exists) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.sessionRsvp.upsert({
    where: { sessionId_userId: { sessionId, userId: session.user.id } },
    update: { status },
    create: { id: randomUUID(), sessionId, userId: session.user.id, status },
  });

  const rsvps = await prisma.sessionRsvp.findMany({ where: { sessionId } });
  return NextResponse.json({
    myStatus: status,
    inCount: rsvps.filter((r) => r.status === "in").length,
    outCount: rsvps.filter((r) => r.status === "out").length,
    maybeCount: rsvps.filter((r) => r.status === "maybe").length,
  });
}
