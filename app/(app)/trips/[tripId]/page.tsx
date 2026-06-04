import { TripDetail } from "@/components/trips/trip-detail";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <TripDetail id={tripId} />;
}
