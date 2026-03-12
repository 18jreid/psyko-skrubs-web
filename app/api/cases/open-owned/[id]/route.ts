import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { weightedRandomForCase, generateFloat } from "@/lib/caseItems";
import { randomUUID } from "crypto";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Verify ownership and not already opened or listed
  const userCase = await prisma.userCase.findFirst({
    where: { id, userId: user.id, opened: false },
    include: { listing: true, caseType: true },
  });
  if (!userCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (userCase.listing?.status === "active") {
    return NextResponse.json({ error: "Case is listed on the market — cancel the listing first" }, { status: 400 });
  }

  const winner = weightedRandomForCase(userCase.caseType.id);
  const float = generateFloat(winner.name);

  // Mark case as opened and create the dropped item
  const [, userItem] = await prisma.$transaction([
    prisma.userCase.update({
      where: { id: userCase.id },
      data: { opened: true },
    }),
    prisma.userItem.create({
      data: { id: randomUUID(), userId: user.id, itemId: winner.id, float },
    }),
  ]);

  return NextResponse.json({ item: winner, userItemId: userItem.id, float });
}
