import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") ?? "";
  const shareIds = idsParam.split(",").filter(Boolean);

  if (shareIds.length === 0) {
    return NextResponse.json({});
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const votes = await prisma.clipVote.findMany({
    where: { shareId: { in: shareIds } },
  });

  const result: Record<string, { score: number; userVote: number }> = {};
  for (const shareId of shareIds) {
    const clipVotes = votes.filter((v) => v.shareId === shareId);
    const score = clipVotes.reduce((sum, v) => sum + v.value, 0);
    const userVote = userId ? (clipVotes.find((v) => v.userId === userId)?.value ?? 0) : 0;
    result[shareId] = { score, userVote };
  }

  return NextResponse.json(result);
}
