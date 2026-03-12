export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { CASE_ITEMS } from "@/lib/caseItems";
import imageData from "@/lib/itemImages.json";

const staticImages = imageData as Record<string, string | null>;

export async function GET() {
  const imageMap: Record<string, string | null> = {};
  for (const item of CASE_ITEMS) {
    imageMap[item.id] = staticImages[item.id] ?? null;
  }
  return NextResponse.json(imageMap);
}
