import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = body.ids;

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
