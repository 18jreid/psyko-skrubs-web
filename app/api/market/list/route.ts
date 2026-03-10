import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { userItemId, price } = await req.json();
  if (!userItemId || typeof price !== "number" || price < 1) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Verify ownership and not already listed
  const userItem = await prisma.userItem.findFirst({
    where: { id: userItemId, userId: user.id, sold: false },
    include: { listing: true },
  });
  if (!userItem) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (userItem.listing?.status === "active") {
    return NextResponse.json({ error: "Already listed" }, { status: 400 });
  }

  const listing = await prisma.marketListing.create({
    data: {
      id: randomUUID(),
      sellerId: user.id,
      userItemId,
      itemId: userItem.itemId,
      price: Math.round(price),
    },
  });

  return NextResponse.json({ listingId: listing.id });
}
