export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ balance: null });

  const user = await prisma.user.findUnique({
    where: { steamId: session.user.steamId },
    select: { balance: true },
  });

  return NextResponse.json({ balance: user?.balance ?? 0 });
}
