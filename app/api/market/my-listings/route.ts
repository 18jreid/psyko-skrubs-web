export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([]);

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json([]);

  const listings = await prisma.marketListing.findMany({
    where: { sellerId: user.id },
    include: {
      item: true,
      buyer: { select: { username: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    listings.map((l) => ({
      id: l.id,
      price: l.price,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
      soldAt: l.soldAt?.toISOString() ?? null,
      buyer: l.buyer,
      item: l.item,
    }))
  );
}
