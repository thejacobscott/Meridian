"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Heart,
  Loader2,
  Send,
  Utensils,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/field";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useHub } from "@/lib/hub/store";
import {
  countKind,
  HUB_MOMENTS,
  sortHub,
  type HubMoment,
  type HubNote,
} from "@/lib/hub/types";
import { useSpace } from "@/lib/space/store";
import { firstName, type SpaceMember } from "@/lib/space/types";
import { useTrips } from "@/lib/trips/store";
import { effectiveStatus } from "@/lib/trips/types";

/** Presentation for each loggable moment — the button label and timeline line. */
const MOMENT: Record<
  HubMoment,
  { label: string; line: string; icon: LucideIcon; fill?: boolean }
> = {
  miss: { label: "I miss you", line: "misses you", icon: Heart, fill: true },
  facetime: { label: "FaceTime", line: "had a FaceTime", icon: Video },
  meal: { label: "Meal together", line: "shared a meal", icon: Utensils },
};

const TONE = {
  a: { avatar: "bg-clay/15 ring-clay/20", icon: "text-clay" },
  b: { avatar: "bg-sage/20 ring-sage/30", icon: "text-sage" },
} as const;

/**
 * The connection hub — the "remote hub to connect" between visits. A few glance
 * trackers (days apart and trips together, derived from the calendar; "miss
 * you"s and FaceTimes, counted from the timeline), one card to leave a note or
 * log a moment, and the shared timeline of everything you both add. It's the
 * lean first cut: the moment kinds and trackers are built to grow.
 */
export function HubScreen() {
  const { notes, ready, post, remove } = useHub();
  const { you, partner } = useSpace();
  const { trips } = useTrips();
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const sorted = React.useMemo(() => sortHub(notes), [notes]);

  // Trackers derived from the trips calendar: how long since you were last in
  // the same place, and how many trips you've shared.
  const stats = React.useMemo(() => {
    if (!now) return { daysApart: null as number | null, tripsTogether: 0 };
    const active = trips.some((t) => effectiveStatus(t, now) === "active");
    const lastEnd = trips
      .filter((t) => t.end_date && effectiveStatus(t, now) === "past")
      .map((t) => t.end_date as string)
      .sort((a, b) => b.localeCompare(a))[0];
    const daysApart = active
      ? 0
      : lastEnd
        ? Math.max(0, Math.floor((now.getTime() - parseISO(lastEnd).getTime()) / 86_400_000))
        : null;
    const tripsTogether = trips.filter((t) => {
      const s = effectiveStatus(t, now);
      return s === "active" || s === "past";
    }).length;
    return { daysApart, tripsTogether };
  }, [trips, now]);

  return (
    <div className="space-y-8">
      <header className="pt-2">
        <p className="eyebrow">Between visits</p>
        <h1 className="mt-1 text-[2rem] leading-tight tracking-[-0.02em]">
          The little things
        </h1>
      </header>

      {/* Trackers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={now ? stats.daysApart ?? "—" : "—"} label="days apart" />
        <Stat value={now ? stats.tripsTogether : "—"} label="trips together" />
        <Stat value={countKind(notes, "miss")} label="“miss you”s" />
        <Stat value={countKind(notes, "facetime")} label="FaceTimes" />
      </div>

      {/* Leave a note or log a moment */}
      <Card className="p-4 sm:p-5">
        <Composer onPost={(body) => post({ kind: "note", body })} />
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {HUB_MOMENTS.map((m) => (
            <MomentButton
              key={m}
              moment={m}
              count={countKind(notes, m)}
              onClick={() => void post({ kind: m })}
            />
          ))}
        </div>
      </Card>

      {/* Timeline */}
      {!ready ? (
        <div className="space-y-3">
          <div className="h-[4.5rem] animate-pulse rounded-2xl bg-surface-2/60" />
          <div className="h-[4.5rem] animate-pulse rounded-2xl bg-surface-2/60" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Heart size={24} strokeWidth={1.5} />}
          title="Nothing here yet"
          body="Leave the first note, or log a little moment. Everything you both add lands here, newest first."
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          <AnimatePresence initial={false}>
            {sorted.map((n) => (
              <Entry
                key={n.id}
                note={n}
                you={you}
                partner={partner}
                onRemove={() => void remove(n.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-4 text-center">
      <div className="font-display text-[1.7rem] leading-none tabular-nums text-ink">
        {value}
      </div>
      <div className="eyebrow mt-2 text-[0.58rem]">{label}</div>
    </div>
  );
}

function Composer({ onPost }: { onPost: (body: string) => Promise<void> }) {
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const canPost = body.trim().length > 0 && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    setSaving(true);
    try {
      await onPost(body.trim());
      setBody("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a note — a thought, a tiny update, a good morning…"
        aria-label="Write a note"
        rows={3}
        maxLength={1000}
        className="min-h-[5.5rem]"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!canPost}>
          {saving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} strokeWidth={1.75} />
          )}
          Post
        </Button>
      </div>
    </form>
  );
}

function MomentButton({
  moment,
  count,
  onClick,
}: {
  moment: HubMoment;
  count: number;
  onClick: () => void;
}) {
  const m = MOMENT[moment];
  const Icon = m.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
    >
      <Icon size={15} strokeWidth={1.75} className="text-accent" />
      {m.label}
      {count > 0 && (
        <span className="tabular-nums text-ink-soft/70">{count}</span>
      )}
    </button>
  );
}

function Entry({
  note,
  you,
  partner,
  onRemove,
}: {
  note: HubNote;
  you: SpaceMember;
  partner: SpaceMember;
  onRemove: () => void;
}) {
  const slot = note.author === "b" ? "b" : "a";
  const author = note.author === "b" ? partner : note.author === "a" ? you : null;
  const tone = TONE[slot];
  const mine = note.author === you.slot;
  const when = formatDistanceToNow(parseISO(note.created_at), { addSuffix: true });
  const moment = note.kind === "note" ? null : MOMENT[note.kind];
  const MomentIcon = moment?.icon;

  return (
    <motion.div variants={fadeUp} layout exit={{ opacity: 0, y: -8 }}>
      <Card className="group flex items-start gap-3 px-4 py-3.5 sm:px-5">
        <Avatar name={author?.name ?? "Someone"} size={34} className={tone.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-ink">
              {firstName(author?.name ?? "Someone")}
            </span>
            <span className="text-xs tabular-nums text-ink-soft">{when}</span>
          </div>
          {moment ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
              {MomentIcon && (
                <MomentIcon
                  size={14}
                  strokeWidth={1.75}
                  className={tone.icon}
                  style={moment.fill ? { fill: "currentColor" } : undefined}
                />
              )}
              {moment.line}
            </p>
          ) : (
            <p className="mt-1 text-pretty text-[0.95rem] leading-relaxed text-ink">
              {note.body}
            </p>
          )}
        </div>
        {mine && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="-mr-1 -mt-0.5 shrink-0 rounded-full p-1.5 text-ink-soft opacity-0 transition-opacity hover:bg-ink/[0.04] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        )}
      </Card>
    </motion.div>
  );
}
