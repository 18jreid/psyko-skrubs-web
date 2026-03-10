import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllInventoryValues } from "@/lib/inventory";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { steamId: true },
    });

    const steamIds = users.map((u: { steamId: string }) => u.steamId);
    const inventories = await getAllInventoryValues(steamIds);

    return NextResponse.json(inventories);
  } catch (error) {
    console.error("Error fetching inventories:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventories" },
      { status: 500 }
    );
  }
}
