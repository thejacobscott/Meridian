"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Luggage, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { useSpace } from "@/lib/space/store";
import { DEFAULT_SPACE, firstName } from "@/lib/space/types";
import { usePacking, useTripPacking } from "@/lib/packing/store";
import {
  PACK_OWNER_ORDER,
  packingProgress,
  type PackingItem,
  type PackOwner,
} from "@/lib/packing/types";
import type { Trip } from "@/lib/trips/types";

/**
 * The Packing sub-tab — a shared checklist so between the two of you nothing
 * gets left behind. Items are grouped by who carries them (both of us / you /
 * your person), tick off as you pack, and the header empties as you go.
 */
export function PackingTab({ trip }: { trip: Trip }) {
  const reduce = useReducedMotion();
  const { items, ready } = useTripPacking(trip.id);
  const { addItem, updateItem, togglePacked, removeItem } = usePacking();
  const { partner } = useSpace();

  const [label, setLabel] = React.useState("");
  const [owner, setOwner] = React.useState<PackOwner>("shared");

  // The default placeholder ("Your person") shouldn't masquerade as a real name.
  const partnerNamed =
    partner.name.trim() !== "" && partner.name !== DEFAULT_SPACE.members[1].name;
  const partnerShort = partnerNamed ? firstName(partner.name) : "Them";
  const partnerLong = partnerNamed ? partner.name : "Your person";

  const ownerHeading = (o: PackOwner) =>
    o === "shared" ? "Both of us" : o === "a" ? "You" : partnerLong;
  const ownerChip = (o: PackOwner) =>
    o === "shared" ? "Both" : o === "a" ? "You" : partnerShort;

  const progress = packingProgress(items);
  const allPacked = progress.total > 0 && progress.remaining === 0;

  const groups = PACK_OWNER_ORDER.map((o) => ({
    owner: o,
    list: items.filter((i) => i.owner === o),
  })).filter((g) => g.list.length > 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = label.trim();
    if (!t) return;
    await addItem(trip.id, { label: t, owner });
    setLabel("");
  }

  if (!ready) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-card bg-surface-2" />
        <div className="h-11 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-40 animate-pulse rounded-card bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {progress.total > 0 && (
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-ink-soft tabular-nums">
              {allPacked ? (
                <span className="text-ink">All packed — have the best time</span>
              ) : (
                <>
                  <span className="font-medium text-ink">{progress.packed}</span> of{" "}
                  {progress.total} packed
                </>
              )}
            </p>
            {!allPacked && (
              <p className="text-xs text-ink-soft/70 tabular-nums">
                {progress.remaining} to go
              </p>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${Math.round(progress.ratio * 100)}%` }}
              transition={spring}
            />
          </div>
        </div>
      )}

      {/* Quick add */}
      <form onSubmit={handleAdd} className="space-y-2.5">
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Add something to pack…"
            aria-label="New packing item"
            enterKeyHint="done"
          />
          <Button
            type="submit"
            disabled={!label.trim()}
            aria-label="Add item"
            className="shrink-0 px-4"
          >
            <Plus size={18} strokeWidth={1.75} />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-soft/70">For</span>
          {PACK_OWNER_ORDER.map((o) => (
            <OwnerChip
              key={o}
              label={ownerChip(o)}
              owner={o}
              on={owner === o}
              onClick={() => setOwner(o)}
            />
          ))}
        </div>
      </form>

      {items.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-surface/40 px-7 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-deep">
            <Luggage size={22} strokeWidth={1.5} />
          </span>
          <h3 className="mt-4 text-lg">Nothing on the list yet</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft text-balance">
            Add what each of you needs to bring — tick things off together as the
            bags come together.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.owner} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: OWNER_DOT[g.owner] }}
                  aria-hidden="true"
                />
                <p className="eyebrow">{ownerHeading(g.owner)}</p>
              </div>
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {g.list.map((item) => (
                    <PackRow
                      key={item.id}
                      item={item}
                      reduce={!!reduce}
                      onToggle={() => togglePacked(item.id)}
                      onQty={(qty) => updateItem(item.id, { qty })}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const OWNER_DOT: Record<PackOwner, string> = {
  shared: "var(--color-gold)",
  a: "var(--color-clay)",
  b: "var(--color-sage)",
};

function OwnerChip({
  label,
  owner,
  on,
  onClick,
}: {
  label: string;
  owner: PackOwner;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        on
          ? "border-accent/40 bg-accent/[0.08] text-ink"
          : "border-line bg-surface/60 text-ink-soft hover:text-ink",
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: OWNER_DOT[owner] }}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}

function PackRow({
  item,
  reduce,
  onToggle,
  onQty,
  onRemove,
}: {
  item: PackingItem;
  reduce: boolean;
  onToggle: () => void;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const packed = item.is_packed;
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      className="list-none"
    >
      <div className="group flex items-center gap-2 rounded-xl px-1 py-1">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={packed}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1.5 pl-1 pr-2 text-left transition-colors hover:bg-ink/[0.02]"
        >
          <span
            className={cn(
              "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors",
              packed
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-transparent",
            )}
          >
            <Check size={13} strokeWidth={2.5} />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[0.95rem] transition-colors",
              packed ? "text-ink-soft line-through decoration-line" : "text-ink",
            )}
          >
            {item.label}
          </span>
        </button>

        {packed ? (
          item.qty > 1 && (
            <span className="shrink-0 px-1 text-xs tabular-nums text-ink-soft/70">
              ×{item.qty}
            </span>
          )
        ) : (
          <div className="flex shrink-0 items-center gap-0.5 text-ink-soft">
            <button
              type="button"
              aria-label={`Fewer ${item.label}`}
              disabled={item.qty <= 1}
              onClick={() => onQty(item.qty - 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-ink/[0.05] disabled:opacity-30"
            >
              <Minus size={13} strokeWidth={2} />
            </button>
            <span className="w-4 text-center text-xs tabular-nums">{item.qty}</span>
            <button
              type="button"
              aria-label={`More ${item.label}`}
              onClick={() => onQty(item.qty + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-ink/[0.05]"
            >
              <Plus size={13} strokeWidth={2} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.label}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft/50 transition-colors hover:bg-ink/[0.05] hover:text-ink"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
    </motion.li>
  );
}
