import { NextResponse } from "next/server";
import { clinics } from "@/lib/data";

export function GET() {
  return NextResponse.json({ count: clinics.length, clinics });
}
