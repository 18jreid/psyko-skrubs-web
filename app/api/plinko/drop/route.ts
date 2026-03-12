export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dropBall, MULTIPLIERS, VALID_BETS, type PlinkoRows, type PlinkoRisk } from "@/lib/plinkoConfig";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { bet, rows, risk } = body as { bet: number; rows: PlinkoRows; risk: PlinkoRisk };

  if (!VALID_BETS.includes(bet as (typeof VALID_BETS)[number]))
    return NextResponse.json({ error: "Invalid bet" }, { status: 400 });
  if (![8, 12, 16].includes(rows))
    return NextResponse.json({ error: "Invalid rows" }, { status: 400 });
  if (!["low", "medium", "high"].includes(risk))
    return NextResponse.json({ error: "Invalid risk" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.balance < bet) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  const { path, bucketIdx } = dropBall(rows);
  const multiplier = MULTIPLIERS[rows][risk][bucketIdx];
  const winnings = Math.floor(bet * multiplier);
  const delta = winnings - bet;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { balance: { increment: delta } },
  });

  return NextResponse.json({ path, bucketIdx, multiplier, bet, winnings, delta, balance: updated.balance });
}
