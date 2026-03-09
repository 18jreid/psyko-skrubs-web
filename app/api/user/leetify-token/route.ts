import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeetifyStats } from "@/lib/leetify";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Verify the token works by fetching Leetify stats
  const stats = await getLeetifyStats(session.user.steamId, token.trim());
  if (!stats) {
    return NextResponse.json(
      { error: "Token invalid or Leetify profile not found" },
      { status: 400 }
    );
  }

  // Save token to DB
  await prisma.user.update({
    where: { id: session.user.id },
    data: { leetifyToken: token.trim() },
  });

  return NextResponse.json({ success: true, stats });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { leetifyToken: null },
  });

  return NextResponse.json({ success: true });
}
