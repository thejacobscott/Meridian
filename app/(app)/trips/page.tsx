import { Map } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function TripsPage() {
  return (
    <div className="space-y-8">
      <header className="pt-2">
        <p className="eyebrow">Trips</p>
        <h1 className="mt-1 text-[2rem] leading-tight tracking-[-0.02em]">
          Dream, plan, remember
        </h1>
      </header>

      <EmptyState
        icon={<Map size={24} strokeWidth={1.5} />}
        title="No trips yet"
        body="Every trip starts as a daydream. The one you plan here grows into a day-by-day itinerary, then a scrapbook you keep forever."
      />

      <p className="text-center text-xs text-ink-soft/70">
        Trip cards and the create flow arrive in Sprint 1.
      </p>
    </div>
  );
}
