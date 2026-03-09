import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAM_ID_REGEX = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;

export async function GET(request: NextRequest) {
  const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const homeUrl = new URL("/", NEXTAUTH_URL);

  try {
    const { searchParams } = request.nextUrl;

    // Verify the OpenID assertion with Steam
    const verifyParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key === "openid.mode") {
        verifyParams.set("openid.mode", "check_authentication");
      } else {
        verifyParams.set(key, value);
      }
    });
    verifyParams.set("openid.ns", "http://specs.openid.net/auth/2.0");

    const verifyRes = await fetch(STEAM_OPENID_URL, {
      method: "POST",
      body: verifyParams.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const verifyText = await verifyRes.text();
    if (!verifyText.includes("is_valid:true")) {
      console.error("Steam OpenID verification failed:", verifyText);
      return NextResponse.redirect(homeUrl);
    }

    // Extract Steam ID from claimed_id
    const claimedId = searchParams.get("openid.claimed_id") || "";
    const match = claimedId.match(STEAM_ID_REGEX);
    if (!match) {
      console.error("Could not extract Steam ID from:", claimedId);
      return NextResponse.redirect(homeUrl);
    }
    const steamId = match[1];

    // Fetch Steam profile
    const steamRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
    );
    const steamData = await steamRes.json();
    const player = steamData?.response?.players?.[0];

    const username = player?.personaname || `Player ${steamId.slice(-6)}`;
    const avatar =
      player?.avatarfull ||
      "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg";
    const profileUrl =
      player?.profileurl || `https://steamcommunity.com/profiles/${steamId}`;

    // Upsert user in DB
    const user = await prisma.user.upsert({
      where: { steamId },
      update: { username, avatar, profileUrl },
      create: { steamId, username, avatar, profileUrl },
    });

    // Create NextAuth JWT token
    const token = await encode({
      token: {
        sub: user.id,
        steamId: user.steamId,
        name: user.username,
        picture: user.avatar,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // Set session cookie (same name NextAuth uses)
    const isSecure = NEXTAUTH_URL.startsWith("https://");
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const response = NextResponse.redirect(homeUrl);
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Steam auth callback error:", error);
    return NextResponse.redirect(homeUrl);
  }
}
