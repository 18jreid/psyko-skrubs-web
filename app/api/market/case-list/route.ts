import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { userCaseId, price } = await req.json();
  if (!userCaseId || typeof price !== "number" || price < 1) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userCase = await prisma.userCase.findFirst({
    where: { id: userCaseId, userId: user.id, opened: false },
    include: { listing: true },
  });
  if (!userCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (userCase.listing?.status === "active") {
    return NextResponse.json({ error: "Already listed" }, { status: 400 });
  }

  const listing = await prisma.caseMarketListing.create({
    data: {
      id: randomUUID(),
      sellerId: user.id,
      userCaseId,
      caseTypeId: userCase.caseTypeId,
      price: Math.round(price),
    },
  });

  return NextResponse.json({ listingId: listing.id });
}
