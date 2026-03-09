import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after"); // cursor: last message id seen

  try {
    const messages = await prisma.chatMessage.findMany({
      take: 50,
      orderBy: { createdAt: "asc" },
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await req.json();
  if (!content?.trim() || content.trim().length > 500) {
    return NextResponse.json({ error: "Message must be 1–500 characters" }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      id: randomUUID(),
      userId: session.user.id,
      content: content.trim(),
    },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
