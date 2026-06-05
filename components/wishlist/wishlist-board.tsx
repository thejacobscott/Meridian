"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useTrips } from "@/lib/trips/store";
import { useWishlist } from "@/lib/wishlist/store";
import { useSpace } from "@/lib/space/store";
import { firstName, type SpaceMember } from "@/lib/space/types";
import {
  bothWant,
  isPromoted,
  sortWishlist,
  wants,
  type WishlistItem,
} from "@/lib/wishlist/types";
import { WishlistItemForm } from "./wishlist-item-form";

/**
 * The shared someday board: the "between trips" heart of the app. Every dream is
 * a card the two of you heart independently (one tap each); the ones you both
 * want rise to the top, and any of them can graduate into a real trip — which
 * keeps the dream→plan thread unbroken via `promoted_to_trip_id`.
 */
export function WishlistBoard() {
  const {
    items,
    ready,
    addItem,
    updateItem,
    removeItem,
    toggleVote,
    markPromoted,
  } = useWishlist();
  const { you, partner } = useSpace();
  const { createTrip } = useTrips();
  const router = useRouter();

  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<WishlistItem | null>(null);
  const [promoting, setPromoting] = React.useState<string | null>(null);

  const sorted = sortWishlist(items);
  const isEmpty = ready && items.length === 0;

  async function promote(item: WishlistItem) {
    if (promoting) return;
    setPromoting(item.id);
    try {
      // The dream becomes a dateless "dreaming" trip; the link back keeps the
      // someday and the trip as one continuous object.
      const trip = await createTrip({
        title: item.title,
        destination: item.place,
        status: null,
      });
      await markPromoted(item.id, trip.id);
      router.push(`/trips/${trip.id}`);
    } finally {
      setPromoting(null);
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <p className="eyebrow">Someday</p>
          <h1 className="mt-1 text-[2rem] leading-tight tracking-[-0.02em]">
            The places you&rsquo;re dreaming of
          </h1>
        </div>
        <Button type="button" onClick={() => setAdding(true)} className="shrink-0">
          <Plus size={18} strokeWidth={1.75} />
          Add
        </Button>
      </header>

      {isEmpty ? (
        <EmptyState
          icon={<Sparkles size={24} strokeWidth={1.5} />}
          title="Nothing on the list yet"
          body="Add a city, a hotel, a tiny restaurant — anything you both want to do together one day. Heart your favorites, then turn a winner into a real trip."
          action={
            <Button type="button" onClick={() => setAdding(true)}>
              <Plus size={18} strokeWidth={1.75} />
              Add your first someday
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          <AnimatePresence initial={false}>
            {sorted.map((item) => (
              <WishItemCard
                key={item.id}
                item={item}
                you={you}
                partner={partner}
                busy={promoting === item.id}
                onToggle={(slot) => toggleVote(item.id, slot)}
                onEdit={() => setEditing(item)}
                onPromote={() => promote(item)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add */}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a someday">
        <WishlistItemForm
          key="new"
          onSubmit={async (draft) => {
            await addItem({ ...draft, added_by: you.slot });
          }}
          onDone={() => setAdding(false)}
        />
      </Sheet>

      {/* Edit */}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit someday"
      >
        {editing && (
          <WishlistItemForm
            key={editing.id}
            item={editing}
            onSubmit={(draft) => updateItem(editing.id, draft)}
            onDone={() => setEditing(null)}
            onDelete={async () => {
              await removeItem(editing.id);
              setEditing(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

const TONE = {
  a: {
    ring: "border-clay/40 bg-clay/10",
    heart: "text-clay",
    fill: "var(--color-clay)",
    avatar: "bg-clay/15 ring-clay/20",
  },
  b: {
    ring: "border-sage/45 bg-sage/15",
    heart: "text-sage",
    fill: "var(--color-sage)",
    avatar: "bg-sage/20 ring-sage/30",
  },
} as const;

function WishItemCard({
  item,
  you,
  partner,
  busy,
  onToggle,
  onEdit,
  onPromote,
}: {
  item: WishlistItem;
  you: SpaceMember;
  partner: SpaceMember;
  busy: boolean;
  onToggle: (slot: "a" | "b") => void;
  onEdit: () => void;
  onPromote: () => void;
}) {
  const promoted = isPromoted(item);
  const both = bothWant(item);
  const adder =
    item.added_by === "a" ? you : item.added_by === "b" ? partner : null;
  // "Your someday" reads naturally for your own (whatever your name is);
  // the partner's gets their first name.
  const adderLabel =
    item.added_by === "a"
      ? "Your someday"
      : item.added_by === "b"
        ? `${firstName(partner.name)}'s someday`
        : "A shared someday";

  return (
    <motion.div variants={fadeUp} layout exit={{ opacity: 0, y: -8 }}>
      <Card className={cn("px-5 py-5 sm:px-6", promoted && "opacity-65")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {adder ? (
              <Avatar
                name={adder.name}
                size={22}
                className={TONE[item.added_by === "a" ? "a" : "b"].avatar}
              />
            ) : (
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gold/12 text-gold">
                <Sparkles size={12} strokeWidth={1.75} />
              </span>
            )}
            <span className="truncate text-xs text-ink-soft">{adderLabel}</span>
          </div>

          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit someday"
            className="-mr-1.5 -mt-1 shrink-0 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <Pencil size={15} strokeWidth={1.75} />
          </button>
        </div>

        <h2 className="mt-3 text-lg leading-snug">{item.title}</h2>
        {item.place && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin size={14} strokeWidth={1.75} className="shrink-0" />
            <span className="truncate">{item.place}</span>
          </p>
        )}
        {item.note && (
          <p className="mt-2 text-sm text-ink-soft text-balance">{item.note}</p>
        )}

        {both && !promoted && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/12 px-2.5 py-1 text-[0.7rem] font-medium text-gold">
            <Heart size={11} strokeWidth={2} style={{ fill: "var(--color-gold)" }} />
            You both want this
          </p>
        )}

        {promoted ? (
          <Link
            href={`/trips/${item.promoted_to_trip_id}`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Now a trip
            <ArrowRight size={15} strokeWidth={1.75} />
          </Link>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <HeartToggle
              name={firstName(you.name)}
              on={wants(item, "a")}
              slot="a"
              onClick={() => onToggle("a")}
            />
            <HeartToggle
              name={firstName(partner.name)}
              on={wants(item, "b")}
              slot="b"
              onClick={() => onToggle("b")}
            />
            <span className="flex-1" />
            <button
              type="button"
              onClick={onPromote}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-accent-deep transition-colors hover:bg-accent/[0.08] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ArrowRight size={15} strokeWidth={1.75} />
              )}
              Make it a trip
            </button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function HeartToggle({
  name,
  on,
  slot,
  onClick,
}: {
  name: string;
  on: boolean;
  slot: "a" | "b";
  onClick: () => void;
}) {
  const t = TONE[slot];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        on
          ? cn(t.ring, "text-ink")
          : "border-line bg-surface/60 text-ink-soft hover:text-ink",
      )}
    >
      <Heart
        size={15}
        strokeWidth={1.75}
        className={on ? t.heart : "text-ink-soft"}
        style={on ? { fill: t.fill } : undefined}
      />
      {name}
    </button>
  );
}
