import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const listing = await prisma.marketListing.findUnique({ where: { id } });
  if (!listing || listing.sellerId !== user.id || listing.status !== "active") {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  await prisma.marketListing.update({ where: { id }, data: { status: "cancelled" } });
  return NextResponse.json({ ok: true });
}
