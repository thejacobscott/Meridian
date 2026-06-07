import { Clock, LogOut, Palette } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Hairline } from "@/components/ui/hairline";
import { buttonVariants } from "@/components/ui/button";
import { InviteCode } from "@/components/space/invite-code";
import { SpaceEditor } from "@/components/space/space-editor";
import { YourAwakeHours } from "@/components/space/your-awake-hours";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

/** Turn "America/New_York" into "New York" for a softer read. */
function prettyTz(tz: string | null) {
  if (!tz) return "—";
  const tail = tz.split("/").pop() ?? tz;
  return tail.replace(/_/g, " ");
}

export default async function ProfilePage() {
  if (isSupabaseConfigured) {
    const connected = await loadSpace();
    if (connected) return <ConnectedProfile {...connected} />;
  }
  return <PreviewProfile />;
}

type Member = {
  user_id: string;
  display_name: string | null;
  home_city: string | null;
};

async function loadSpace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("members")
    .select("space_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  const [{ data: space }, { data: members }] = await Promise.all([
    supabase
      .from("spaces")
      .select("name, invite_code, home_tz_a, home_tz_b")
      .eq("id", membership.space_id)
      .single(),
    supabase
      .from("members")
      .select("user_id, display_name, home_city")
      .eq("space_id", membership.space_id)
      .order("created_at", { ascending: true }),
  ]);

  if (!space) return null;
  return { space, members: (members ?? []) as Member[], userId: user.id };
}

function ConnectedProfile({
  space,
  members,
  userId,
}: NonNullable<Awaited<ReturnType<typeof loadSpace>>>) {
  const tzByIndex = [space.home_tz_a, space.home_tz_b];
  const awaitingPartner = members.length < 2;

  return (
    <div className="space-y-8">
      <header className="pt-2">
        <p className="eyebrow">{space.name}</p>
        <h1 className="mt-1 text-[2rem] leading-tight tracking-[-0.02em]">
          You &amp; your person
        </h1>
      </header>

      <Card className="divide-y divide-line">
        {members.map((m, i) => {
          const isYou = m.user_id === userId;
          return (
            <div key={m.user_id} className="flex items-center gap-4 px-5 py-4">
              <Avatar name={m.display_name} size={48} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {m.display_name ?? "Someone"}
                  {isYou && (
                    <span className="ml-2 text-xs font-normal text-ink-soft">
                      you
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-ink-soft">
                  {m.home_city ?? "No home city yet"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm tabular-nums text-ink-soft">
                <Clock size={15} strokeWidth={1.6} />
                {prettyTz(tzByIndex[i])}
              </div>
            </div>
          );
        })}
      </Card>

      <YourAwakeHours />

      {awaitingPartner && (
        <Card className="px-5 py-5">
          <p className="eyebrow text-accent-deep">Still just you</p>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-soft">
            Share this code so your person can join your space.
          </p>
          <div className="mt-4">
            <InviteCode code={space.invite_code} />
          </div>
        </Card>
      )}

      <Card className="px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-soft">
            <Palette size={18} strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">Shared color</p>
            <p className="text-sm text-ink-soft">Warm clay — your default theme</p>
          </div>
          <span
            className="h-7 w-7 rounded-full ring-1 ring-line"
            style={{ backgroundColor: "var(--accent)" }}
            aria-hidden="true"
          />
        </div>
      </Card>

      <Hairline />

      <form action={signOut} className="flex justify-center">
        <button
          type="submit"
          className={buttonVariants({ variant: "quiet", size: "sm" })}
        >
          <LogOut size={15} strokeWidth={1.7} />
          Sign out
        </button>
      </form>
    </div>
  );
}

function PreviewProfile() {
  return (
    <div className="space-y-8">
      <header className="pt-2">
        <p className="eyebrow">You</p>
        <h1 className="mt-1 text-[2rem] leading-tight tracking-[-0.02em]">
          You &amp; your person
        </h1>
        <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-ink-soft">
          Set your names, home cities, and time zones — your clocks on the home
          screen follow along.
        </p>
      </header>

      <SpaceEditor />

      <Card className="px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-soft">
            <Palette size={18} strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">Shared color</p>
            <p className="text-sm text-ink-soft">Warm clay — your default theme</p>
          </div>
          <span
            className="h-7 w-7 rounded-full ring-1 ring-line"
            style={{ backgroundColor: "var(--accent)" }}
            aria-hidden="true"
          />
        </div>
      </Card>

      <Hairline />

      <p className="text-balance text-center text-sm text-ink-soft">
        You&apos;re in preview — every screen works right here on this device.
        Sign-in and live syncing between the two of you switch on once your
        space is connected.
      </p>
    </div>
  );
}
