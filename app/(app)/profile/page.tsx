import { LogOut, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Hairline } from "@/components/ui/hairline";
import { buttonVariants } from "@/components/ui/button";
import { InviteCode } from "@/components/space/invite-code";
import { ConnectedSpace } from "@/components/space/connected-space";
import { SpaceEditor } from "@/components/space/space-editor";
import { HubSwitcher } from "@/components/space/hub-switcher";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function ProfilePage() {
  if (isSupabaseConfigured) {
    const connected = await loadSpace();
    if (connected) return <ConnectedProfile {...connected} />;
  }
  return <PreviewProfile />;
}

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
      .select("name, invite_code")
      .eq("id", membership.space_id)
      .single(),
    supabase
      .from("members")
      .select("user_id")
      .eq("space_id", membership.space_id),
  ]);

  if (!space) return null;
  return { space, memberCount: (members ?? []).length };
}

function ConnectedProfile({
  space,
  memberCount,
}: NonNullable<Awaited<ReturnType<typeof loadSpace>>>) {
  const awaitingPartner = memberCount < 2;

  return (
    <div className="space-y-8">
      <header className="pt-2">
        <p className="eyebrow">Settings</p>
        <h1 className="mt-1 text-[2rem] leading-tight tracking-[-0.02em]">
          You &amp; your person
        </h1>
      </header>

      <ConnectedSpace hasPartner={!awaitingPartner} />

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

      <SharedColorCard />

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

      <HubSwitcher />

      <SharedColorCard />

      <Hairline />

      <p className="text-balance text-center text-sm text-ink-soft">
        You&apos;re in preview — every screen works right here on this device.
        Sign-in and live syncing between the two of you switch on once your
        space is connected.
      </p>
    </div>
  );
}

function SharedColorCard() {
  return (
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
  );
}
