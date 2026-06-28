import { MapExplorerClient } from "@/components/map-explorer-client";
import { clinicSortRank, displayClinicName, getClinicProfile, getClinicProfiles } from "@/lib/clinic-profiles";
import { publicCities } from "@/lib/options";
import { getPublicClinicCards } from "@/lib/public-ui";

type MapPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = await searchParams;
  const clinics = groupMapClinics(getPublicClinicCards());

  return <MapExplorerClient clinics={clinics} cities={publicCities} initialClinicId={params.clinic} />;
}

type PublicClinicMapItem = ReturnType<typeof getPublicClinicCards>[number];

function groupMapClinics(items: PublicClinicMapItem[]) {
  const grouped = new Map<string, PublicClinicMapItem[]>();
  for (const item of items) {
    const hasAddress = item.clinic.address && !item.clinic.address.toLowerCase().includes("уточняется");
    const name = displayClinicName(item.clinic.name);
    const key = hasAddress ? item.clinic.id : `${name}|${item.clinic.city}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  const publicClinics = Array.from(grouped.values()).map((group) => {
    const primary = group[0];
    const profile = getClinicProfile(primary.clinic.name);
    const prices = group.flatMap((item) => [item.minPrice, item.maxPrice]).filter((value) => value > 0).sort((a, b) => a - b);
    const serviceNames = Array.from(new Set(group.flatMap((item) => item.serviceNames))).sort((a, b) => a.localeCompare(b, "ru"));
    const branch = profile?.branches.find((item) => item.city === primary.clinic.city && item.coordinates) ?? profile?.branches.find((item) => item.coordinates) ?? profile?.branches.find((item) => item.city === primary.clinic.city);
    const address = branch?.address ?? primary.clinic.address;
    return {
      id: primary.clinic.id,
      name: displayClinicName(primary.clinic.name),
      city: branch?.city ?? primary.clinic.city,
      address,
      minPrice: prices[0] ?? 0,
      servicesCount: group.reduce((sum, item) => sum + item.servicesCount, 0),
      serviceNames,
      branchNote: profile?.branch_notes,
      updatedAt: group.map((item) => item.updatedAt).filter(Boolean).sort().at(-1),
      lat: branch?.coordinates?.lat ?? null,
      lng: branch?.coordinates?.lng ?? null
    };
  });
  const publicNames = new Set(publicClinics.map((clinic) => displayClinicName(clinic.name).toLowerCase()));
  const profileClinics = getClinicProfiles()
    .filter((profile) => !publicNames.has(displayClinicName(profile.name).toLowerCase()))
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      city: profile.city_coverage[0] ?? profile.branches[0]?.city ?? "Алматы",
      address: profile.branches[0]?.address ?? profile.branch_notes,
      minPrice: 0,
      servicesCount: 0,
      serviceNames: profile.highlights,
      branchNote: profile.branch_notes,
      updatedAt: undefined,
      lat: profile.branches.find((branch) => branch.coordinates)?.coordinates?.lat ?? null,
      lng: profile.branches.find((branch) => branch.coordinates)?.coordinates?.lng ?? null
    }));
  return [...publicClinics, ...profileClinics].sort((a, b) => {
    const rank = clinicSortRank(a.name) - clinicSortRank(b.name);
    if (rank !== 0) return rank;
    return b.servicesCount - a.servicesCount || a.name.localeCompare(b.name, "ru");
  });
}
