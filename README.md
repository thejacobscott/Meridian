# Meridian

A private, two-person space to **plan every trip together and keep every trip
forever**. It opens as a calendar and ages into a scrapbook. Built for one
couple — not a social network, not a SaaS dashboard.

Next.js (App Router) · Tailwind v4 · Framer Motion · Supabase.

---

## 1. Run it locally (preview mode)

You don't need a backend to see the design. Without Supabase keys, Meridian
runs in **preview mode**: every screen renders, sign-in and sync are off.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

---

## 2. Connect Supabase (turns on accounts + sync)

### a. Create the project
1. Make a free project at [supabase.com](https://supabase.com).
2. Open **Project Settings → API** and copy the **Project URL** and the
   **anon / public** key.

### b. Add your keys
Copy the example env file and paste your two values in:

```bash
cp .env.example .env.local
```

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### c. Create the database
Open **SQL Editor** in the Supabase dashboard, paste the entire contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and
run it. This creates every table, the Row-Level-Security policies that keep a
space visible only to its two members, the `trip-photos` storage bucket, and
the default trip categories.

> Prefer the CLI? `supabase db push` applies the same migration.

### d. Allow the magic-link to come back
In **Authentication → URL Configuration**:
- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/auth/callback`
  (and later your Vercel URL — see step 4).

Restart `npm run dev` after editing `.env.local`.

---

## 3. The two-person invite flow

Meridian holds exactly **two** people per space.

1. **You** open the app, enter your email, and click the magic link. You land
   on **Welcome → Start fresh**, set your name, home city, and time zone, and
   get an **8-character invite code**.
2. **Your person** opens the app on *their* device, signs in with their own
   email, chooses **Welcome → I have a code**, and enters that code.
3. You're both in the same space now, from anywhere. The code can be re-found
   any time on the **You** tab until they've joined.

A third person who tries to join an already-full space is turned away by the
database, not just the UI.

---

## 4. Deploy to Vercel

1. Push this repo to GitHub and **import it** at
   [vercel.com/new](https://vercel.com/new).
2. Add the same two environment variables
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel
   project settings.
3. Deploy.
4. Back in Supabase → **Authentication → URL Configuration**, add your live
   origin to the allowlist:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** `https://your-app.vercel.app/auth/callback`

That's it — install it to a phone home screen from the browser's *Share → Add
to Home Screen* and it behaves like an app.

---

## Scripts

| Command         | Does                                    |
| --------------- | --------------------------------------- |
| `npm run dev`   | Local dev server (Turbopack)            |
| `npm run build` | Production build                        |
| `npm run start` | Serve the production build              |
| `npm run lint`  | ESLint                                  |

## Where things live

```
app/(app)/        The signed-in app (Home, Trips, Someday, You) + the shell
app/login         Magic-link sign-in
app/welcome       Create-or-join onboarding
app/auth/         Callback route + sign-out action
components/        Editorial UI kit, shell, auth + space pieces
lib/supabase/     Browser / server / middleware clients + hand-written types
supabase/         The SQL migration (schema, RLS, storage, seed data)
```
