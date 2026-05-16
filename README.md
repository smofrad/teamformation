# Team Formation

A mobile-first team lineup and match planning app built with Next.js, React, TypeScript, Tailwind CSS, Prisma, and Firebase-backed parts from the original project.

## Features

- Simple staff login with a shared password
- Session selection from a config file
- QR scanning with device camera
- Supports JSON and plain text QR payloads
- Manual fallback check-in form
- Firestore-backed check-in history
- Duplicate protection per attendee/session within 30 seconds
- Admin overview with session filter, search, totals, and CSV export

## Routes

- `/login`
- `/select-session`
- `/scan?session=<session-id>`
- `/admin`

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Firebase Firestore
- `@yudiel/react-qr-scanner`

## Local setup

Requires Node.js 20+.

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env.local
```

3. Fill in Firebase values in `.env.local`.

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

Use the password from `STAFF_ACCESS_PASSWORD` on `/login`.

## Firebase setup

1. Create a Firebase project.
2. Enable Firestore.
3. Add a Web app in Firebase project settings.
4. Copy the config values into `.env.local`.
5. For MVP/demo use, create Firestore in test mode or apply limited write rules for staff devices.

Suggested collections:

- `checkins`: one document per check-in
- `checkinLocks`: one document per `sessionId__emailKey` used for duplicate protection
- Optional `sessions`: only needed if you later want runtime-managed sessions instead of code config

Example document fields in `checkins`:

- `attendeeName`
- `attendeeTitle`
- `attendeeEmail`
- `emailKey`
- `sessionId`
- `sessionName`
- `timestamp`
- `scannedBy`
- `source`

## Session configuration

Edit the session list in [lib/sessions.ts](/Users/sammofrad/Desktop/Codex projekt/lib/sessions.ts).

## Example QR payloads

Generate sample payloads for testing:

```bash
npm run demo:payloads
```

Supported formats:

```json
{"name":"Anna Svensson","title":"CFO","email":"anna@company.se"}
```

```text
NAME:Anna Svensson
TITLE:CFO
EMAIL:anna@company.se
```

## Deployment

### Vercel

1. Import the repo into Vercel.
2. Create and connect a PostgreSQL database.
3. Add the environment variables from `.env.local`.
4. Deploy.

### Recommended database setup

For this project on Vercel, use Prisma Postgres or another PostgreSQL-compatible hosted database.

Prisma's Vercel guide notes that connecting a Prisma Postgres database to a Vercel project will automatically set `DATABASE_URL` for the app, which is the cleanest path for Prisma deployments on Vercel.

Suggested flow:

1. In Vercel, open your project.
2. Go to `Storage`.
3. Create a `Prisma Postgres` database.
4. Connect it to the project.
5. Verify that `DATABASE_URL` appears under project environment variables.
6. Redeploy the app.

You still need to add:

```env
STAFF_ACCESS_PASSWORD=your-password
```

If you use the Firebase-backed parts of the app, also set:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## V2 foundation

The repo now includes a Supabase-backed V2 foundation:

- `/v2/login`
- `/v2`
- `supabase/v2-schema.sql`

Use the SQL file in the Supabase SQL editor to create the V2 tables and policies.

### Firebase Hosting

1. Build the app with `npm run build`.
2. Configure Firebase Hosting for your Next.js deployment setup.
3. Add the same environment variables in your hosting environment.

## Architecture summary

- Next.js App Router handles pages and simple server-side route protection.
- A cookie-based shared password gate protects staff pages for the MVP.
- Firestore is accessed directly from the client for reads and writes.
- Duplicate scans are blocked via a Firestore transaction against a `checkinLocks` helper document.
- Sessions are defined in code for simple event-day maintenance.

## Assumptions

- A shared staff password is acceptable for the MVP.
- Firestore client writes are acceptable for this first version.
- Device time is acceptable for timestamping in the MVP.
- Session management from code is simpler than building a settings UI right now.

## Notes

- If dependencies are not installed yet, run `npm install` before starting or building.
- The QR scanner requires camera permission in the browser.
