export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { CASE_DROP_PROFILES } from "@/lib/caseItems";
import imageData from "@/lib/itemImages.json";

const staticImages = imageData as Record<string, string | null>;

export async function GET() {
  const imageMap: Record<string, string | null> = {};
  for (const id of Object.keys(CASE_DROP_PROFILES)) {
    imageMap[id] = staticImages[id] ?? null;
  }
  return NextResponse.json(imageMap);
}
