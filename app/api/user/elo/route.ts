import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { elo } = await req.json();

  if (elo !== null && (typeof elo !== "number" || !Number.isInteger(elo) || elo < 0 || elo > 35000)) {
    return NextResponse.json({ error: "ELO must be an integer between 0 and 35000" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { cs2Elo: elo },
    select: { cs2Elo: true },
  });

  return NextResponse.json(user);
}
