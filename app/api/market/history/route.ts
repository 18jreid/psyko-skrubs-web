export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sales = await prisma.marketListing.findMany({
    where: { status: "sold" },
    include: {
      item: true,
      seller: { select: { username: true, avatar: true } },
      buyer:  { select: { username: true, avatar: true } },
    },
    orderBy: { soldAt: "desc" },
    take: 40,
  });

  return NextResponse.json(
    sales.map((s) => ({
      id: s.id,
      price: s.price,
      soldAt: s.soldAt?.toISOString() ?? null,
      seller: s.seller,
      buyer: s.buyer,
      item: s.item,
    }))
  );
}
