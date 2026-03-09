import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username || !/^[a-zA-Z0-9_]{1,16}$/.test(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    // Get UUID from username
    const profileRes = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
      { next: { revalidate: 300 } }
    );

    if (profileRes.status === 404) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    if (!profileRes.ok) {
      return NextResponse.json({ error: "Mojang API unavailable" }, { status: 502 });
    }

    const { id: uuid, name } = await profileRes.json();

    // Get skin/cape from session server
    const sessionRes = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,
      { next: { revalidate: 300 } }
    );

    let skinUrl: string | null = null;
    let capeUrl: string | null = null;

    if (sessionRes.ok) {
      const session = await sessionRes.json();
      const textureProp = session.properties?.find((p: { name: string }) => p.name === "textures");
      if (textureProp) {
        try {
          const decoded = JSON.parse(Buffer.from(textureProp.value, "base64").toString("utf-8"));
          skinUrl = decoded?.textures?.SKIN?.url ?? null;
          capeUrl = decoded?.textures?.CAPE?.url ?? null;
        } catch {
          // ignore decode errors
        }
      }
    }

    return NextResponse.json({
      uuid,
      name,
      skinUrl,
      capeUrl,
      headUrl: `https://crafatar.com/avatars/${uuid}?size=128&overlay`,
      bodyUrl: `https://crafatar.com/renders/body/${uuid}?scale=6&overlay`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch player" }, { status: 500 });
  }
}
