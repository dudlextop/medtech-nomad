import { NextRequest, NextResponse } from "next/server";
import { getPublicRecordsByIds } from "@/lib/data";

export function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);

  const records = getPublicRecordsByIds(ids);
  return NextResponse.json({ count: records.length, records });
}
