import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let client: BrowserClient | undefined;

/**
 * The single shared browser client for the whole app — one realtime websocket
 * that every store multiplexes its channels over (creating a fresh client per
 * provider would open a socket each). Safe to call from any client component or
 * event handler; it's created lazily on first use.
 */
export function getBrowserClient(): BrowserClient {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}

/** Back-compat alias for the auth forms; returns the shared singleton. */
export function createClient(): BrowserClient {
  return getBrowserClient();
}
