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

  const { id: shareId } = await params;
  const { value } = await req.json();

  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Vote must be 1 or -1" }, { status: 400 });
  }

  const existing = await prisma.clipVote.findUnique({
    where: { userId_shareId: { userId: session.user.id, shareId } },
  });

  if (existing) {
    if (existing.value === value) {
      await prisma.clipVote.delete({ where: { id: existing.id } });
    } else {
      await prisma.clipVote.update({ where: { id: existing.id }, data: { value } });
    }
  } else {
    await prisma.clipVote.create({
      data: { id: randomUUID(), userId: session.user.id, shareId, value },
    });
  }

  const votes = await prisma.clipVote.findMany({ where: { shareId } });
  const score = votes.reduce((sum, v) => sum + v.value, 0);
  const userVote = await prisma.clipVote.findUnique({
    where: { userId_shareId: { userId: session.user.id, shareId } },
  });

  return NextResponse.json({ score, userVote: userVote?.value ?? 0 });
}
