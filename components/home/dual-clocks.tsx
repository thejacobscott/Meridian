"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { useSpace } from "@/lib/space/store";
import { offsetLabel, zonedTime } from "@/lib/space/clock";
import type { SpaceMember } from "@/lib/space/types";

/**
 * Two live clocks — your time and your person's — so the distance always has a
 * face on it: you can see it's nearly midnight for them before you text. Times
 * tick only after mount (SSR can't know the wall clock), and the partner column
 * shows how far ahead/behind they are right now.
 */
export function DualClocks() {
  const { you, partner } = useSpace();
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-line">
        <ClockColumn member={you} now={now} baseTz={you.tz} isYou />
        <ClockColumn member={partner} now={now} baseTz={you.tz} />
      </div>
    </Card>
  );
}

function ClockColumn({
  member,
  now,
  baseTz,
  isYou = false,
}: {
  member: SpaceMember;
  now: Date | null;
  baseTz: string;
  isYou?: boolean;
}) {
  const z = now ? zonedTime(now, member.tz) : null;
  const sub = isYou
    ? "your time"
    : now
      ? offsetLabel(now, member.tz, baseTz)
      : "";

  return (
    <div className="px-4 py-6 text-center sm:px-6">
      <p className="eyebrow truncate">{member.name || (isYou ? "You" : "Your person")}</p>
      <p className="mt-3 leading-none">
        <span
          className="text-[2rem] tabular-nums tracking-tight text-ink sm:text-[2.25rem]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 480 }}
        >
          {z?.time ?? "––:––"}
        </span>
        {z?.period && (
          <span className="ml-1 text-sm font-medium text-ink-soft">{z.period}</span>
        )}
      </p>
      <p className="mt-2 truncate text-xs text-ink-soft">
        {z?.weekday ? z.weekday : ""}
        {member.city ? `${z?.weekday ? " · " : ""}${member.city}` : ""}
      </p>
      <p className="mt-0.5 text-[0.7rem] text-ink-faint">{sub}</p>
    </div>
  );
}
