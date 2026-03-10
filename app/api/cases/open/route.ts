import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { weightedRandom, CASE_COST } from "@/lib/caseItems";
import { randomUUID } from "crypto";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.balance < CASE_COST) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const winner = weightedRandom();

  const [updated, userItem] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: CASE_COST } },
    }),
    prisma.userItem.create({
      data: { id: randomUUID(), userId: user.id, itemId: winner.id },
    }),
  ]);

  return NextResponse.json({
    item: winner,
    userItemId: userItem.id,
    newBalance: updated.balance,
  });
}
