import { TripBook } from "@/components/book/trip-book";

export default async function TripBookPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <TripBook id={tripId} />;
}
