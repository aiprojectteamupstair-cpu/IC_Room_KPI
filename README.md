# Innovation Centre — Client booking & room management

Two clearly separated workspaces:

- `/` opens **Explore**, with room information and booking guidance. `/schedule` opens the **client mini calendar**, with a responsive six-week month grid and the selected day's reservations and available times. The single **Book a space** action in the bottom navigation carries the selected room and date into the request form. No account is required. Personal information is never published.
- `/admin` opens the **management workspace after login**. Administrators approve requests, edit bookings, block time, configure rooms, review usage and download formatted Excel reports.

The public navigation has no administrator switch; open `/admin` directly to sign in. Both public and admin calendars use compact month grids, with dots for booked, completed, pending (admin only), and unavailable times. Administrators select a day to inspect its reservations or add a booking or block. The supplied Innovation Centre logo appears in the top navigation. The application starts with one room, with room-scoped data and selectors ready for additional rooms.

## Local PostgreSQL — works without Supabase credentials

The application uses the existing **`IC_Room_Schedule`** database on the local PostgreSQL server at **`localhost:5432`**. Manage that database in pgAdmin 4. Configure its authenticated connection URL in `.env.local`; the setup script uses that URL rather than creating a second database or cluster.

```powershell
npm ci
# Set DATABASE_PROVIDER=local and DATABASE_URL in .env.local first.
npm run db:local:setup
npm run dev -- --port 3017
```

Open **http://localhost:3017** for clients and **http://localhost:3017/admin** for administrators. Local setup is idempotent: it applies unapplied migrations and adds the initial **Innovation Centre Main Room** only when no room exists. It does not insert sample bookings, contacts or maintenance blocks. It preserves the configured connection URL and supplied Supabase values.

The generated admin email and password are in **`.local/admin-credentials.txt`**. Both `.local/` and `.env.local` are gitignored. Passwords in the database are salted scrypt hashes. Session cookies are signed with a generated secret, HttpOnly, SameSite=Lax, expire after eight hours, and are checked against the database role and session version. Five failed attempts lock the account for 15 minutes.

```powershell
npm run admin:local-reset    # Generate a new admin password and revoke existing sessions
```

The PostgreSQL server must be running before starting the application. Database credentials remain server-only. URL-encode any special characters in the database password when putting it in `DATABASE_URL`; do not commit `.env.local`.

After initial setup, `npm run dev` checks connectivity and room access before opening Next.js. Administrator login is separate from the PostgreSQL database password.

## Supabase hosting

To host with Supabase:

1. Create a project and run **both** files in `supabase/migrations/` in filename order using the SQL Editor, as the database owner. Alternatively use Supabase CLI: `supabase link --project-ref YOUR_REF`, then `supabase db push`.
2. Run `supabase/seed.sql` to add the initial room. It contains no sample bookings or customer data.
3. Set Vercel's **Production** environment to `DATABASE_PROVIDER=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `DEMO_MODE=false`. Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are also supported. Use keys from the same Supabase project as the URL. Redeploy after changing environment variables; public values are embedded during the build. See `.env.production.example`. Local database variables are not used by the Supabase provider. Never copy `local/bootstrap.sql` to Supabase; Supabase already supplies its Auth schema and roles.
4. Create a confirmed Auth user in Supabase Dashboard → Authentication → Users → Add user. Provision the profile as an operator:

```sql
insert into public.profiles(id, full_name, role)
values ('YOUR-AUTH-USER-UUID', 'Centre Administrator', 'super_admin');
```

5. Disable public signups for this administrator-only account model, configure Auth password/login limits, and set Site URL and allowed redirects to the deployment origin. Sign in at `/admin`.

Deploy to Vercel or a Node-compatible Next.js host with `npm ci && npm run build`. Set secrets in the host's environment manager and restart after changes. No real service credentials are included in this repository. Local accounts are separate from Supabase Auth accounts; local sample data is not automatically uploaded to a hosted project.

### Diagnosing a failed hosted page

The Vercel log entry `[Supabase] Could not load rooms` includes the original database error code and message. The page keeps a general error message for visitors. A generic Next.js error digest alone does not identify the database failure.

Copy the hosted public URL and publishable/anon key into the gitignored `.env.production.local`, then run:

```powershell
npm run db:supabase:check
```

This performs the same anonymous rooms query as the page, then checks `public_schedule`, `busy_slots`, and `unavailable_ranges`. It does not write data or print records or keys. Missing tables/functions indicate missing migrations; `42501` indicates missing permissions. Check Data API settings if `public` is not exposed. An empty room list requires an active room; `supabase/seed.sql` adds the initial room without bookings. Do not rerun the initial migration on an existing schema or disable RLS to hide an access error.

### Environment variables

| Variable                               | Usage                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_PROVIDER`                    | `local` for PostgreSQL; `supabase` for hosting                                                 |
| `DATABASE_URL`                         | Server-only authenticated connection to `localhost:5432/IC_Room_Schedule`                      |
| `LOCAL_SESSION_SECRET`                 | Server-only local cookie signing secret, generated by local setup                              |
| `NEXT_PUBLIC_SUPABASE_URL`             | Hosted Supabase project URL                                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Hosted public key, protected by grants and RLS                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server-only hosted booking RPC key                                                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Current hosted public key; preferred over the legacy anon variable                             |
| `SUPABASE_SECRET_KEY`                  | Current server-only hosted booking key; preferred over the legacy service role variable        |
| `DEMO_MODE`                            | Optional read-only public demo when neither real provider is configured; ignored in production |

See `.env.example`. Modules accessing database connections and secrets import `server-only`. Admin pages always require login; there is no demo administrator bypass.

## Architecture and stack

Next.js 16 App Router, strict TypeScript, React, Tailwind CSS, local shadcn-style Radix primitives, React Hook Form, Zod, date-fns, Recharts, Lucide, Supabase, node-postgres and ExcelJS. Installed versions are pinned in `package.json` and `package-lock.json`.

Server Components fetch data. Client Components provide calendar navigation, forms, charts and dialogs. `DATABASE_PROVIDER` selects the database transport; **both transports use the same PostgreSQL schema, booking RPC, validation triggers, reservation constraint and RLS**. Local queries run in transactions with `SET LOCAL ROLE` and the verified administrator identity. Parameterized values are used for all native PostgreSQL queries. Admin writes authenticate and authorize again at the Server Action boundary.

```text
app/(public)/             Client calendar, booking and confirmation
app/admin/login/          Local or Supabase password login
app/admin/(workspace)/    Protected dashboard, bookings, calendar, KPI and settings
app/admin/export/         Protected XLSX download endpoint
app/api/                  Public availability and booking submission
app/actions/              Authorized administrator mutations
components/calendar/     Reusable calendar and client scheduling experience
components/booking/      Availability, validated form and receipt
components/admin/        Navigation, management dialogs and export controls
components/dashboard/    KPI cards, reporting filters and charts
components/ui/           Reusable UI primitives
lib/database/            Native PostgreSQL queries, sessions and transport adapter
lib/supabase/            Hosted clients, authorization and shared queries
lib/booking/             Availability and Yangon time rules
lib/analytics/           Reporting periods and KPI calculations
lib/export/              Formatted, typed Excel workbook generator
lib/validation/          Shared input schemas
supabase/migrations/     Schema, constraints, RLS, RPCs and safe availability
supabase/tests/          Rollback-only SQL verification
local/                   Standalone PostgreSQL compatibility setup
scripts/                 Local database, administrator and integration commands
tests/                   Availability, timezone, KPI and Excel regression tests
proxy.ts                 Login redirects and hosted session refresh
```

Public pages and local admin pages refresh every 30 seconds, and when the tab returns to the foreground. Hosted admin pages additionally use authenticated Supabase Realtime subscriptions under SELECT RLS. Public clients only fetch anonymized schedule/occupied-time RPC data.

## Excel exports

**Export Excel** is available on the admin overview, booking register and KPI page. Booking exports honor search, date, status, activity and sorting filters across all matching pages. KPI exports honor the reporting period and room selection.

Each `.xlsx` contains:

- **Overview:** red/black branded title, numeric KPI summaries with formulas and cached values, activity distribution, and metric definitions.
- **Bookings:** private booking register with readable column widths, colored statuses, zebra rows, frozen headers/reference columns and filters. Phone numbers remain text; dates and times are typed Excel values. Customer text is stored as text, never executable formulas.
- **Daily usage:** booked and available hours, utilization formulas and color-scaled percentages, with printable headers and page numbering.

Exports require a valid admin session and use `Cache-Control: private, no-store`. They include customer contact details and should be handled as confidential management records.

## Database and booking safety

`rooms` stores capacity, operating hours, duration/interval rules, active status and approval mode. `bookings` and `room_blocks` reference `room_id`. `profiles` assigns Auth users roles; `booking_history` records creation, edits and status transitions. UUIDs remain internal; readable references use the Yangon date and an atomic hexadecimal sequence.

A private shared reservation ledger covers **pending, approved and completed bookings plus room blocks**. Its GiST exclusion constraint `(room_id WITH =, occupied WITH &&)` prevents overlapping ranges across both booking/block tables. Half-open `[start,end)` intervals allow adjacent reservations.

Triggers update the ledger in the same transaction as the booking/block. Room row locks serialize configuration and reservation writes; multiple room locks use UUID order. The constraint is the final concurrency barrier, even when simultaneous frontend availability checks both succeed. Conflicts produce SQLSTATE `23P01`, translated into a friendly HTTP 409 response. Capacity, duration, time alignment, past dates and operating hours are revalidated by PostgreSQL, and settings changes that invalidate future reservations are rejected.

Pending requests hold their time until reviewed. Pending → approved/rejected/cancelled and approved → completed/cancelled are allowed; final statuses are read-only. A booking cannot be completed before its end. Public submissions use only the constrained creation RPC. Anonymous users have no raw booking, block, profile or history read/write access. Public schedule RPCs expose activity only for confirmed events; occupied-range RPCs expose only dates/times, never pending status, contact details, names or notes.

Submission includes a same-origin check, honeypot, and transactional phone throttle of three requests per ten minutes. The hosted service key is accessed only by the booking server module; administrators use their authenticated session.

## Dates and KPIs

Booking dates and `time without time zone` represent **Asia/Yangon wall time**. PostgreSQL compares them with `timezone('Asia/Yangon', now())`; JavaScript uses explicit Yangon `Intl.DateTimeFormat` and date-only date-fns arithmetic. Audit timestamps are `timestamptz`. Browser timezone does not determine availability.

Only approved and completed bookings contribute to usage. Booked hours are summed durations; utilization divides those hours by current room operating hours across the selected calendar days, after subtracting blocked time. Average duration and people divide eligible hours/attendees by eligible booking count. Participants are attendee places, not unique people or verified attendance. Activity shares use eligible booking counts; popular hours count bookings overlapping each hour. Ties use the earliest hour and Sunday-first weekday order.

Periods include today, last seven days, month-to-date, previous complete month, trailing three months, year-to-date and custom up to 366 days. Hosted queries page through API row limits so totals are not silently truncated. The initial model has daily operating hours and explicit closure blocks; historical utilization uses **current settings**, not effective-dated historical operating schedules. This definition is displayed in the UI and export.

## Verification

```powershell
npm run typecheck
npm test
npm run db:local:test
npm run test:local       # Requires running Next dev server on 3017
npm run format:check
npm run build
```

`db:local:test` checks constraints/access grants and launches two genuinely concurrent booking transactions. `test:local` checks public privacy, protected routes, actual password login, simultaneous HTTP booking requests, administrator approval, public schedule changes, filtered Excel downloads and forged-session denial. It removes its booking data afterward; a verification workbook is kept in ignored `.local/verified-export.xlsx`. Use `SMOKE_URL` to test another development port. Supabase staging can run `supabase/tests/constraints.sql` after migrations; it rolls back all its test data.

Additional rooms require new `rooms` rows; room selection and filtered reporting already support them. Future member accounts, equipment, attendance and notifications can be added without redesigning existing booking foreign keys.
