import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { minecraftUsername: { not: null } },
      select: {
        id: true,
        username: true,
        avatar: true,
        profileUrl: true,
        minecraftUsername: true,
      },
    });

    // Fetch UUID + head for each member in parallel
    const members = await Promise.all(
      users.map(async (u) => {
        try {
          const res = await fetch(
            `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(u.minecraftUsername!)}`,
            { next: { revalidate: 3600 } }
          );
          if (!res.ok) return { ...u, uuid: null, headUrl: null };
          const { id: uuid } = await res.json();
          return {
            ...u,
            uuid,
            headUrl: `https://crafatar.com/avatars/${uuid}?size=64&overlay`,
            bodyUrl: `https://crafatar.com/renders/body/${uuid}?scale=4&overlay`,
          };
        } catch {
          return { ...u, uuid: null, headUrl: null, bodyUrl: null };
        }
      })
    );

    return NextResponse.json(members);
  } catch {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
