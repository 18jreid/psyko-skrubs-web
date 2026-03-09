import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const requests = await prisma.featureRequest.findMany({
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        votes: { select: { userId: true, value: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const withScore = requests.map((r) => ({
      ...r,
      score: r.votes.reduce((sum, v) => sum + v.value, 0),
    }));

    withScore.sort((a, b) => b.score - a.score);

    return NextResponse.json(withScore);
  } catch {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const request = await prisma.featureRequest.create({
    data: {
      id: randomUUID(),
      userId: session.user.id,
      title: title.trim(),
      description: description?.trim() || null,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
