import { NextResponse } from "next/server";
import { parserLogs, rawImports, unmatchedServices } from "@/lib/data";

export function GET() {
  return NextResponse.json({
    rawImports,
    parserLogs,
    unmatchedServices
  });
}
