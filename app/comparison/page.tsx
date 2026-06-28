import { ComparisonPage } from "@/components/comparison-page";
import { getPublicRecordsByIds } from "@/lib/data";

type ComparisonRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ComparisonRoute({ searchParams }: ComparisonRouteProps) {
  const params = await searchParams;
  const rawItems = Array.isArray(params.items) ? params.items[0] : params.items;
  const ids = rawItems ? decodeURIComponent(rawItems).split(",").filter(Boolean).slice(0, 3) : [];
  const records = getPublicRecordsByIds(ids);
  return <ComparisonPage selectedRecords={records} />;
}
