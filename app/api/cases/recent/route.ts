export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const drops = await prisma.userItem.findMany({
    include: { user: true, item: true },
    orderBy: { obtainedAt: "desc" },
    take: 30,
  });

  return NextResponse.json(
    drops.map((d) => ({
      id: d.id,
      obtainedAt: d.obtainedAt.toISOString(),
      sold: d.sold,
      username: d.user.username,
      avatar: d.user.avatar,
      item: d.item,
    }))
  );
}
