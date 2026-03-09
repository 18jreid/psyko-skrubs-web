import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: gameRequestId } = await params;
    const body = await req.json();
    const { value } = body;

    if (value !== 1 && value !== -1) {
      return NextResponse.json(
        { error: "Vote value must be 1 or -1" },
        { status: 400 }
      );
    }

    const gameRequest = await prisma.gameRequest.findUnique({
      where: { id: gameRequestId },
    });
    if (!gameRequest) {
      return NextResponse.json(
        { error: "Game request not found" },
        { status: 404 }
      );
    }

    const existingVote = await prisma.gameVote.findUnique({
      where: {
        userId_gameRequestId: {
          userId: session.user.id,
          gameRequestId,
        },
      },
    });

    if (existingVote) {
      if (existingVote.value === value) {
        // Remove vote if same value (toggle off)
        await prisma.gameVote.delete({ where: { id: existingVote.id } });
      } else {
        // Update to new value
        await prisma.gameVote.update({
          where: { id: existingVote.id },
          data: { value },
        });
      }
    } else {
      await prisma.gameVote.create({
        data: {
          userId: session.user.id,
          gameRequestId,
          value,
        },
      });
    }

    const allVotes = await prisma.gameVote.findMany({
      where: { gameRequestId },
    });
    const score = allVotes.reduce((sum, v) => sum + v.value, 0);

    const userVote = await prisma.gameVote.findUnique({
      where: {
        userId_gameRequestId: {
          userId: session.user.id,
          gameRequestId,
        },
      },
    });

    return NextResponse.json({ score, userVote: userVote?.value || 0 });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
