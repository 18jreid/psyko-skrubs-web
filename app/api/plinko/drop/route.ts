export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dropBall, MULTIPLIERS, VALID_BETS, type PlinkoRows, type PlinkoRisk } from "@/lib/plinkoConfig";

export const VALID_COUNTS = [1, 3, 5, 10] as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { bet, rows, risk, count = 1 } = body as {
    bet: number;
    rows: PlinkoRows;
    risk: PlinkoRisk;
    count: number;
  };

  if (!VALID_BETS.includes(bet as (typeof VALID_BETS)[number]))
    return NextResponse.json({ error: "Invalid bet" }, { status: 400 });
  if (![8, 12, 16].includes(rows))
    return NextResponse.json({ error: "Invalid rows" }, { status: 400 });
  if (!["low", "medium", "high"].includes(risk))
    return NextResponse.json({ error: "Invalid risk" }, { status: 400 });
  if (!VALID_COUNTS.includes(count as (typeof VALID_COUNTS)[number]))
    return NextResponse.json({ error: "Invalid count" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const totalBet = bet * count;
  if (user.balance < totalBet)
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  // Each drop is independent — separate random path per ball
  const drops = Array.from({ length: count }, () => {
    const { path, bucketIdx } = dropBall(rows);
    const multiplier = MULTIPLIERS[rows][risk][bucketIdx];
    const winnings = Math.floor(bet * multiplier);
    return { path, bucketIdx, multiplier, winnings };
  });

  const totalWinnings = drops.reduce((sum, d) => sum + d.winnings, 0);
  const totalDelta = totalWinnings - totalBet;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { balance: { increment: totalDelta } },
  });

  return NextResponse.json({ drops, bet, totalBet, totalWinnings, totalDelta, balance: updated.balance });
}
