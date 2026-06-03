import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function WishlistPage() {
  return (
    <div className="space-y-8">
      <header className="pt-2">
        <p className="eyebrow">Someday</p>
        <h1 className="mt-1 text-[2rem] leading-tight tracking-[-0.02em]">
          The places you&rsquo;re dreaming of
        </h1>
      </header>

      <EmptyState
        icon={<Sparkles size={24} strokeWidth={1.5} />}
        title="Nothing on the list yet"
        body="Add a city, a hotel, a tiny restaurant — anything you both want to do together one day. Vote on favorites and promote a winner into a real trip."
      />

      <p className="text-center text-xs text-ink-soft/70">
        The shared dream board arrives in Sprint 5.
      </p>
    </div>
  );
}
