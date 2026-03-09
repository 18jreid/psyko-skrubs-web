import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clipId } = await params;

    const clip = await prisma.clip.findUnique({ where: { id: clipId } });
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const existingLike = await prisma.clipLike.findUnique({
      where: {
        userId_clipId: {
          userId: session.user.id,
          clipId,
        },
      },
    });

    if (existingLike) {
      await prisma.clipLike.delete({
        where: { id: existingLike.id },
      });
      const count = await prisma.clipLike.count({ where: { clipId } });
      return NextResponse.json({ liked: false, count });
    } else {
      await prisma.clipLike.create({
        data: {
          userId: session.user.id,
          clipId,
        },
      });
      const count = await prisma.clipLike.count({ where: { clipId } });
      return NextResponse.json({ liked: true, count });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
