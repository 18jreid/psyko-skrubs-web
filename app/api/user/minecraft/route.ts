import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await req.json();

  if (username !== null && (typeof username !== "string" || !/^[a-zA-Z0-9_]{1,16}$/.test(username))) {
    return NextResponse.json({ error: "Invalid Minecraft username" }, { status: 400 });
  }

  // Verify the username actually exists on Mojang before saving
  if (username) {
    const check = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`
    );
    if (check.status === 404) {
      return NextResponse.json({ error: "Minecraft account not found" }, { status: 404 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { minecraftUsername: username || null },
    select: { minecraftUsername: true },
  });

  return NextResponse.json(user);
}
