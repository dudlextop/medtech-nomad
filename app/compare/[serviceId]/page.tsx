import { ServiceDetailPage } from "@/components/service-detail-page";

export default async function CompareServicePage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  return <ServiceDetailPage serviceId={decodeURIComponent(serviceId)} />;
}
