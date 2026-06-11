"use client";

import * as React from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  createHub,
  deleteHub,
  DEFAULT_HUB_ID,
  getActiveHubId,
  listHubs,
  switchHub,
  type PreviewHub,
} from "@/lib/preview/hubs";

/**
 * Preview-only: separate "test hubs", each its own little world (people, trips,
 * someday, notes) in localStorage — so you can try the app as different people
 * without mixing data. Switching reloads into that world; the main hub keeps the
 * original data and can't be deleted.
 */
export function HubSwitcher() {
  const [hubs, setHubs] = React.useState<PreviewHub[]>([]);
  const [activeId, setActiveId] = React.useState(DEFAULT_HUB_ID);
  const [mounted, setMounted] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [armed, setArmed] = React.useState<string | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHubs(listHubs());
    setActiveId(getActiveHubId());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  function create() {
    const name = label.trim();
    if (!name) return;
    const hub = createHub(name);
    switchHub(hub.id); // reloads into the new, empty world
  }

  return (
    <Card className="px-5 py-5">
      <div className="flex items-center gap-2">
        <Layers size={15} strokeWidth={1.75} className="text-accent" />
        <p className="font-medium text-ink">Test hubs</p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Separate worlds for trying things out — each keeps its own people, trips,
        and notes. Just for testing; only here in preview.
      </p>

      <div className="mt-4 space-y-2">
        {hubs.map((h) => {
          const active = h.id === activeId;
          return (
            <div
              key={h.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3.5 py-2.5",
                active
                  ? "border-accent/40 bg-accent/[0.06]"
                  : "border-line bg-surface",
              )}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {h.label}
              </span>
              {active ? (
                <span className="shrink-0 text-xs font-medium text-accent-deep">
                  active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => switchHub(h.id)}
                  className="shrink-0 rounded-full px-3 py-1 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
                >
                  Switch
                </button>
              )}
              {h.id !== DEFAULT_HUB_ID && (
                <button
                  type="button"
                  aria-label={`Delete ${h.label}`}
                  onClick={() => {
                    if (armed !== h.id) {
                      setArmed(h.id);
                      return;
                    }
                    deleteHub(h.id);
                  }}
                  onBlur={() => setArmed(null)}
                  className={cn(
                    "shrink-0 rounded-full p-1.5 transition-colors",
                    armed === h.id
                      ? "bg-clay/10 text-clay"
                      : "text-ink-soft hover:bg-ink/[0.04] hover:text-clay",
                  )}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
            }}
            placeholder="A name for the hub…"
            aria-label="New hub name"
          />
          <Button type="button" size="sm" onClick={create} disabled={!label.trim()}>
            Create
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
        >
          <Plus size={15} strokeWidth={1.75} />
          New hub
        </button>
      )}
    </Card>
  );
}
