"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { zonedTime } from "@/lib/space/clock";
import { useSpace } from "@/lib/space/store";
import type { MemberPatch, MemberSlot, SpaceMember } from "@/lib/space/types";

/** "America/New_York" → "America/New York" — readable but still unambiguous. */
function prettyZone(tz: string): string {
  return tz.replace(/_/g, " ");
}

/** The full IANA list when the engine supports it; a curated fallback if not. */
function useTimeZones(): string[] {
  return React.useMemo(() => {
    const intl = Intl as { supportedValuesOf?: (key: string) => string[] };
    try {
      const v = intl.supportedValuesOf?.("timeZone");
      if (Array.isArray(v) && v.length > 0) return v;
    } catch {
      // fall through to the curated list
    }
    return [
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Sao_Paulo",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Athens",
      "Africa/Johannesburg",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Bangkok",
      "Asia/Shanghai",
      "Asia/Tokyo",
      "Australia/Sydney",
      "Pacific/Auckland",
      "UTC",
    ];
  }, []);
}

/**
 * Editable two-person space for preview mode. Names and cities commit on blur,
 * the time zone on change — all straight into the space store, so the Home
 * clocks and wishlist attribution update the moment you do. Renders nothing
 * until the store has hydrated, so the inputs start from the saved values
 * rather than the seed (and SSR stays in sync).
 */
export function SpaceEditor() {
  const { you, partner, ready, updateMember } = useSpace();
  const [now, setNow] = React.useState<Date | null>(null);
  const zones = useTimeZones();

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!ready) {
    return (
      <Card className="divide-y divide-line">
        <div className="h-[168px] animate-pulse bg-surface-2/60" />
        <div className="h-[168px] animate-pulse bg-surface-2/60" />
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-line">
      <MemberEditor
        slot="a"
        member={you}
        now={now}
        zones={zones}
        isYou
        onChange={updateMember}
      />
      <MemberEditor
        slot="b"
        member={partner}
        now={now}
        zones={zones}
        onChange={updateMember}
      />
    </Card>
  );
}

function MemberEditor({
  slot,
  member,
  now,
  zones,
  isYou = false,
  onChange,
}: {
  slot: MemberSlot;
  member: SpaceMember;
  now: Date | null;
  zones: string[];
  isYou?: boolean;
  onChange: (slot: MemberSlot, patch: MemberPatch) => Promise<void>;
}) {
  const [name, setName] = React.useState(member.name);
  const [city, setCity] = React.useState(member.city ?? "");

  const fallbackName = isYou ? "You" : "Your person";
  const z = now ? zonedTime(now, member.tz) : null;
  // Make sure the saved zone is always selectable, even off the curated list.
  const options = zones.includes(member.tz) ? zones : [member.tz, ...zones];

  return (
    <div className="px-5 py-5">
      <div className="flex items-center gap-3">
        <Avatar
          name={name || fallbackName}
          size={44}
          className={isYou ? "bg-clay/15 ring-clay/20" : "bg-sage/20 ring-sage/30"}
        />
        <div className="min-w-0 flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void onChange(slot, { name: name.trim() || fallbackName })}
            placeholder={isYou ? "Your name" : "Their name"}
            aria-label={isYou ? "Your name" : "Their name"}
            className="text-[1.05rem]"
          />
        </div>
        {isYou && (
          <span className="shrink-0 text-xs text-ink-soft">you</span>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Home city">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={() => void onChange(slot, { city: city.trim() || null })}
            placeholder="City"
          />
        </Field>
        <Field label="Time zone">
          <select
            value={member.tz}
            onChange={(e) => void onChange(slot, { tz: e.target.value })}
            aria-label="Time zone"
            className="h-11 w-full appearance-none rounded-lg border border-line bg-surface px-3.5 text-[0.95rem] text-ink shadow-press transition-colors focus:border-accent/60 focus-visible:outline-none"
          >
            {options.map((tz) => (
              <option key={tz} value={tz}>
                {prettyZone(tz)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-sm tabular-nums text-ink-soft">
        <Clock size={14} strokeWidth={1.6} />
        {z ? `${z.time} ${z.period} · ${z.weekday}` : "—"}
      </p>
    </div>
  );
}
