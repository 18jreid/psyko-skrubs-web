import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { steamId: session.user.steamId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const caseType = await prisma.caseType.findUnique({ where: { id, isActive: true } });
  if (!caseType) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  if (user.balance < caseType.price) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const [updated, userCase] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: caseType.price } },
    }),
    prisma.userCase.create({
      data: { id: randomUUID(), userId: user.id, caseTypeId: caseType.id },
    }),
  ]);

  return NextResponse.json({ userCaseId: userCase.id, newBalance: updated.balance });
}
