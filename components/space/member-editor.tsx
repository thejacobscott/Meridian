"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input } from "@/components/ui/field";
import { zonedTime } from "@/lib/space/clock";
import { prettyZone } from "@/lib/space/zones";
import type { MemberPatch, MemberSlot, SpaceMember } from "@/lib/space/types";
import { AwakeHoursField } from "./awake-hours";

/**
 * One editable member block — name (blur-commit), home city (blur-commit), time
 * zone (change-commit), waking hours, and the live local clock. Shared by the
 * preview space editor (both people) and the real-mode profile (your own row),
 * so the editing surface looks and behaves the same in both.
 */
export function MemberEditor({
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
        {isYou && <span className="shrink-0 text-xs text-ink-soft">you</span>}
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

      <AwakeHoursField
        className="mt-3"
        wakeStart={member.wakeStart}
        wakeEnd={member.wakeEnd}
        onChange={(patch) => void onChange(slot, patch)}
      />

      <p className="mt-3 flex items-center gap-1.5 text-sm tabular-nums text-ink-soft">
        <Clock size={14} strokeWidth={1.6} />
        {z ? `${z.time} ${z.period} · ${z.weekday}` : "—"}
      </p>
    </div>
  );
}
