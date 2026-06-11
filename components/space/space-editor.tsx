"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { useSpace } from "@/lib/space/store";
import { useTimeZones } from "@/lib/space/zones";
import { MemberEditor } from "./member-editor";

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
