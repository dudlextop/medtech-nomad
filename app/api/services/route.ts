import { NextResponse } from "next/server";
import { services } from "@/lib/data";

export function GET() {
  return NextResponse.json({ count: services.length, services });
}
