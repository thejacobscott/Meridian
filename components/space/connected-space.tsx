"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { useSpace } from "@/lib/space/store";
import { prettyZone, useTimeZones } from "@/lib/space/zones";
import { MemberEditor } from "./member-editor";

/**
 * Real-mode settings: edit your own details (name, city, time zone, waking
 * hours) and the space name, right from your profile. Your person's row is
 * read-only — RLS only lets you change your own member row; they edit theirs on
 * their device and it syncs over.
 */
export function ConnectedSpace({ hasPartner }: { hasPartner: boolean }) {
  const { you, partner, ready, updateMember, setSpaceName, space } = useSpace();
  const [now, setNow] = React.useState<Date | null>(null);
  const [name, setName] = React.useState(space.name);
  const zones = useTimeZones();

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!ready) return null;

  return (
    <div className="space-y-6">
      <Card className="px-5 py-5">
        <Field
          label="Your space"
          hint="A name for the two of you — it shows at the top here."
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void setSpaceName(name.trim() || "Us")}
            placeholder="Us"
            aria-label="Space name"
          />
        </Field>
      </Card>

      <Card>
        <MemberEditor
          slot={you.slot}
          member={you}
          now={now}
          zones={zones}
          isYou
          onChange={updateMember}
        />
      </Card>

      {hasPartner && (
        <Card className="px-5 py-5">
          <div className="flex items-center gap-3">
            <Avatar name={partner.name} size={44} className="bg-sage/20 ring-sage/30" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{partner.name}</p>
              <p className="truncate text-sm text-ink-soft">
                {partner.city ?? "No home city yet"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm tabular-nums text-ink-soft">
              <Clock size={15} strokeWidth={1.6} />
              {prettyZone(partner.tz)}
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Your person keeps their own name, city, and hours — they edit those
            on their device and it syncs here.
          </p>
        </Card>
      )}
    </div>
  );
}
