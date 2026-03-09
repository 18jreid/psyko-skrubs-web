import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, avatar: true, steamId: true },
      orderBy: { username: "asc" },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json([]);
  }
}
