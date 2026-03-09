import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host");

  if (!host || !/^[a-zA-Z0-9.\-_:]+(:\d+)?$/.test(host)) {
    return NextResponse.json({ error: "Invalid host" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(host)}`, {
      headers: { "User-Agent": "psyko-skrubs-web/1.0" },
      next: { revalidate: 30 },
    });

    if (!res.ok) return NextResponse.json({ online: false });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ online: false });
  }
}
