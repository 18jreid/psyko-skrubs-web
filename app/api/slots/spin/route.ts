export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomSymbolId, calcPayout, VALID_BETS } from "@/lib/slotSymbols";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bet } = await req.json();
  if (!VALID_BETS.includes(bet)) return NextResponse.json({ error: "Invalid bet" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.balance < bet) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  const reels: [string, string, string] = [randomSymbolId(), randomSymbolId(), randomSymbolId()];
  const { multiplier, winType } = calcPayout(reels);
  const winnings = Math.floor(bet * multiplier);
  const delta = winnings - bet;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { balance: { increment: delta } },
  });

  return NextResponse.json({ reels, multiplier, winType, bet, winnings, delta, balance: updated.balance });
}
