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

  const userCases = await prisma.userCase.findMany({
    where: { userId: user.id, opened: false },
    include: { caseType: true, listing: true },
    orderBy: { obtainedAt: "desc" },
  });

  return NextResponse.json(
    userCases.map((uc) => ({
      id: uc.id,
      obtainedAt: uc.obtainedAt.toISOString(),
      listed: uc.listing?.status === "active",
      caseType: {
        id: uc.caseType.id,
        name: uc.caseType.name,
        description: uc.caseType.description,
        imageEmoji: uc.caseType.imageEmoji,
        price: uc.caseType.price,
      },
    }))
  );
}
