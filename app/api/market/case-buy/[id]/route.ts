import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MARKET_FEE = 0.05;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const buyer = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!buyer) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const listing = await prisma.caseMarketListing.findUnique({ where: { id } });
  if (!listing || listing.status !== "active") {
    return NextResponse.json({ error: "Listing not found or no longer available" }, { status: 404 });
  }
  if (listing.sellerId === buyer.id) {
    return NextResponse.json({ error: "Cannot buy your own listing" }, { status: 400 });
  }
  if (buyer.balance < listing.price) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const sellerPayout = Math.floor(listing.price * (1 - MARKET_FEE));

  await prisma.$transaction([
    prisma.user.update({ where: { id: buyer.id }, data: { balance: { decrement: listing.price } } }),
    prisma.user.update({ where: { id: listing.sellerId }, data: { balance: { increment: sellerPayout } } }),
    prisma.userCase.update({ where: { id: listing.userCaseId }, data: { userId: buyer.id } }),
    prisma.caseMarketListing.update({
      where: { id },
      data: { status: "sold", buyerId: buyer.id, soldAt: new Date() },
    }),
  ]);

  return NextResponse.json({ newBalance: buyer.balance - listing.price });
}
