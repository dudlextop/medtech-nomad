import { NextRequest, NextResponse } from "next/server";
import { searchRecords } from "@/lib/data";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const records = searchRecords({
    q: params.get("q") ?? undefined,
    city: params.get("city") ?? undefined,
    category: params.get("category") ?? undefined,
    partner: params.get("partner") ?? undefined,
    min: params.get("min") ? Number(params.get("min")) : undefined,
    max: params.get("max") ? Number(params.get("max")) : undefined,
    sort: params.get("sort") ?? undefined,
    priceType: params.get("priceType") ?? undefined,
    sourceYear: params.get("sourceYear") ?? undefined,
    sourceKind: params.get("sourceKind") ?? undefined
  });

  return NextResponse.json({ count: records.length, records });
}
