import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get("upcoming") === "1";

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const sessions = await prisma.gamingSession.findMany({
      where: upcoming ? { scheduledAt: { gte: new Date() } } : undefined,
      orderBy: { scheduledAt: "asc" },
      include: {
        createdBy: { select: { id: true, username: true, avatar: true } },
        rsvps: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });

    const enriched = sessions.map((s) => ({
      ...s,
      scheduledAt: s.scheduledAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      rsvps: s.rsvps.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      myStatus: userId
        ? (s.rsvps.find((r) => r.userId === userId)?.status ?? null)
        : null,
      inCount: s.rsvps.filter((r) => r.status === "in").length,
      outCount: s.rsvps.filter((r) => r.status === "out").length,
      maybeCount: s.rsvps.filter((r) => r.status === "maybe").length,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, game, scheduledAt } = await req.json();
  if (!title?.trim() || !game?.trim() || !scheduledAt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const newSession = await prisma.gamingSession.create({
    data: {
      id: randomUUID(),
      title: title.trim(),
      game: game.trim(),
      scheduledAt: scheduledDate,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, username: true, avatar: true } },
    },
  });

  // Fan-out notifications to all users
  const users = await prisma.user.findMany({ select: { id: true } });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      id: randomUUID(),
      userId: u.id,
      type: "session_created",
      message: `${session.user.name} scheduled a session: "${title.trim()}" — ${scheduledDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
      refId: newSession.id,
    })),
  });

  return NextResponse.json(
    { ...newSession, scheduledAt: newSession.scheduledAt.toISOString(), createdAt: newSession.createdAt.toISOString() },
    { status: 201 }
  );
}
