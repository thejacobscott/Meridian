"use client";

import * as React from "react";
import { PhoneCall } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { useSpace } from "@/lib/space/store";
import {
  WAKE_END_MIN,
  WAKE_START_MIN,
  awakeOverlap,
  zonedMinutes,
} from "@/lib/space/clock";

const DAY = 1440;

function fmtClock(min: number): string {
  const t = ((min % DAY) + DAY) % DAY;
  const h24 = Math.floor(t / 60);
  const m = t % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h} ${period}` : `${h}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * "A good time to call" — turns the two clocks into a single overlap band, so the
 * couple can see at a glance the hours they're both awake (shown in *your* local
 * time) and whether right now is one of them. Pure client math over their two
 * time zones; needs no backend.
 */
export function CallWindow() {
  const { you, partner } = useSpace();
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const partnerName = partner.name || "your person";

  const data = React.useMemo(() => {
    if (!now) return null;
    const { windows, totalMinutes, diffMinutes } = awakeOverlap(
      now,
      partner.tz,
      you.tz,
    );
    const yourMin = zonedMinutes(now, you.tz);
    const theirMin = zonedMinutes(now, partner.tz);
    const yAwake = yourMin >= WAKE_START_MIN && yourMin < WAKE_END_MIN;
    const pAwake = theirMin >= WAKE_START_MIN && theirMin < WAKE_END_MIN;
    const nowGood = windows.some((w) => yourMin >= w.start && yourMin < w.end);
    return { windows, totalMinutes, diffMinutes, yourMin, yAwake, pAwake, nowGood };
  }, [now, partner.tz, you.tz]);

  const status = (() => {
    if (!data) return { text: "", good: false };
    if (data.nowGood) return { text: "you're both up now", good: true };
    if (data.pAwake && !data.yAwake)
      return { text: "they're up — late for you", good: false };
    if (data.yAwake && !data.pAwake)
      return { text: `late for ${partnerName}`, good: false };
    return { text: "quiet hours for you both", good: false };
  })();

  const summary = (() => {
    if (!data) return "";
    if (data.totalMinutes === 0)
      return "Your waking hours barely meet — you'll be catching each other early or late.";
    if (data.diffMinutes === 0)
      return "You're on the same clock — call whenever the day allows.";
    if (data.windows.length === 1) {
      const w = data.windows[0];
      return `You're both usually awake from ${fmtClock(w.start)} to ${fmtClock(w.end)}, your time.`;
    }
    const [a, b] = data.windows;
    return `Two windows when you're both up — around ${fmtClock(a.start)} and ${fmtClock(b.start)}, your time.`;
  })();

  return (
    <Card className="px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PhoneCall size={15} strokeWidth={1.75} className="text-accent" />
          <p className="text-sm font-medium text-ink">A good time to call</p>
        </div>
        <p
          className={cn(
            "text-xs transition-colors",
            status.good ? "text-accent-deep" : "text-ink-soft",
          )}
        >
          {status.text}
        </p>
      </div>

      <div className="relative mt-4">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          {data?.windows.map((w, i) => (
            <div
              key={i}
              className="absolute inset-y-0 rounded-full bg-accent/70"
              style={{
                left: `${(w.start / DAY) * 100}%`,
                width: `${((w.end - w.start) / DAY) * 100}%`,
              }}
            />
          ))}
        </div>
        {data && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(data.yourMin / DAY) * 100}%` }}
            aria-hidden="true"
          >
            <span className="block h-3.5 w-0.5 rounded-full bg-ink" />
          </div>
        )}
      </div>

      <div className="mt-1.5 flex justify-between text-[0.65rem] tabular-nums text-ink-faint">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>

      <p className="mt-3 min-h-[1.25rem] text-balance text-sm text-ink-soft">
        {summary}
      </p>
    </Card>
  );
}
