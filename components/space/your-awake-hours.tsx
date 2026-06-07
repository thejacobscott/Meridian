"use client";

import { PhoneCall } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSpace } from "@/lib/space/store";
import { AwakeHoursField } from "./awake-hours";

/**
 * Edit *your* waking window in real mode — your half of "a good time to call".
 * RLS only lets you change your own member row, so this shows just you; your
 * person sets theirs on their device and it syncs over.
 */
export function YourAwakeHours() {
  const { you, ready, updateMember } = useSpace();
  if (!ready) return null;

  return (
    <Card className="px-5 py-5">
      <div className="flex items-center gap-2">
        <PhoneCall size={15} strokeWidth={1.75} className="text-accent" />
        <p className="font-medium text-ink">When you’re awake</p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Sets your half of “a good time to call.” Your person sets theirs.
      </p>
      <AwakeHoursField
        className="mt-4"
        wakeStart={you.wakeStart}
        wakeEnd={you.wakeEnd}
        onChange={(patch) => void updateMember(you.slot, patch)}
      />
    </Card>
  );
}
