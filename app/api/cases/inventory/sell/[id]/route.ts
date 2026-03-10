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

  const userItem = await prisma.userItem.findFirst({
    where: { id, userId: user.id, sold: false },
    include: { item: true },
  });
  if (!userItem) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: userItem.item.sellValue } },
    }),
    prisma.userItem.update({
      where: { id },
      data: { sold: true },
    }),
  ]);

  return NextResponse.json({ newBalance: updated.balance, soldFor: userItem.item.sellValue });
}
