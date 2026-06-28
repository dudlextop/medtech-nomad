import { NextResponse } from "next/server";
import { analytics, cityCoverage, getFairPriceIndex, getRecordsView, services } from "@/lib/data";

export function GET() {
  const fairPriceIndexes = services.map((service) => getFairPriceIndex(service.id)).filter((item) => item.records.length > 0);
  const anomalies = getRecordsView().filter((record) => record.anomalyStatus === "above_market" || record.anomalyStatus === "outlier");

  return NextResponse.json({
    summary: analytics,
    fairPriceIndexes,
    anomalies,
    cityCoverage
  });
}
