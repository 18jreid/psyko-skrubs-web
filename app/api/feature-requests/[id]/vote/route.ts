import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { value } = await req.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  const existing = await prisma.featureVote.findUnique({
    where: { userId_featureRequestId: { userId: session.user.id, featureRequestId: id } },
  });

  if (existing) {
    if (existing.value === value) {
      // Toggle off
      await prisma.featureVote.delete({ where: { id: existing.id } });
    } else {
      // Change vote
      await prisma.featureVote.update({ where: { id: existing.id }, data: { value } });
    }
  } else {
    await prisma.featureVote.create({
      data: { id: randomUUID(), userId: session.user.id, featureRequestId: id, value },
    });
  }

  const votes = await prisma.featureVote.findMany({ where: { featureRequestId: id } });
  return NextResponse.json({ score: votes.reduce((s, v) => s + v.value, 0), votes });
}
