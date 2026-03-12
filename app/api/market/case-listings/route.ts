export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") ?? "newest";

  const listings = await prisma.caseMarketListing.findMany({
    where: { status: "active" },
    include: {
      caseType: true,
      seller: { select: { id: true, username: true, avatar: true } },
    },
    orderBy:
      sort === "price_asc"  ? { price: "asc" }  :
      sort === "price_desc" ? { price: "desc" } :
      { createdAt: "desc" },
  });

  const myId = session?.user?.id ?? null;

  return NextResponse.json(
    listings.map((l) => ({
      id: l.id,
      price: l.price,
      createdAt: l.createdAt.toISOString(),
      isMine: l.sellerId === myId,
      seller: l.seller,
      caseType: l.caseType,
    }))
  );
}
