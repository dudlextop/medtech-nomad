import { PublicSearchBar } from "@/components/public-ui";

export function SearchForm({ defaults = {} }: { defaults?: Record<string, string | undefined> }) {
  return <PublicSearchBar defaults={defaults} />;
}
