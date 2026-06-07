import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Supabase sends the visitor here after they click the email
 * link. Two link shapes can arrive depending on the email template:
 *   • PKCE → `?code=…`               (default for the @supabase/ssr browser client)
 *   • OTP  → `?token_hash=…&type=…`  (older / hosted-template style)
 * We handle both, establish the session cookie, then send them on — to onboarding
 * if this account has no space yet, otherwise into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const supabase = await createClient();

  let failed: boolean;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    failed = Boolean(error);
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  if (failed) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  if (next?.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Route to onboarding when this account isn't part of a space yet.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: membership } = await supabase
      .from("members")
      .select("space_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.redirect(`${origin}/welcome`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
