# Deploying Jobify

How Jobify runs in production: which service handles which part, why it was picked, and exactly how
it was set up. Everything runs on **free tiers**.

> **Live:** https://jobify-hire.vercel.app (API: https://jobify-api-g2kn.onrender.com/api/health).
> Every part is set up. The free API server sleeps when idle, so the first visit can be slow (see
> [Known limitations](#7-known-limitations-sleeping-on-the-free-tier)). Demo logins: see
> [RUNNING_LOCALLY.md](RUNNING_LOCALLY.md#4-demo-accounts) (password `Password123!`).

## Overview

```mermaid
flowchart LR
    Browser["Browser"] --> Vercel["Vercel<br/>apps/web (Next.js)"]
    Vercel -- "/api proxy" --> Render["Render<br/>apps/api + apps/worker"]
    Render --> NeonPG[("Neon Postgres")]
    Render --> NeonS3[("Neon Object Storage<br/>bucket: jobify")]
    Render <--> Redis[("Render Key Value<br/>(Redis)")]
    Browser -. "video" .-> LiveKit["LiveKit Cloud"]
    Render -. "room tokens" .-> LiveKit
    Render -. "emails (worker)" .-> Brevo["Brevo<br/>email"]
```

| Stage                      | Service                        | Why this one                                                                                                      | Status      |
| -------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| Database                   | **Neon** Postgres              | Managed Postgres with a free plan; pauses when idle; branches for safe experiments                                | ✅ Done     |
| File storage (CVs, photos) | **Neon** Object Storage        | S3-compatible, so the app's storage code works unchanged; same account as the database; no card needed            | ✅ Done     |
| API + background worker    | **Render** (free web service)  | Runs long-lived Node servers, which the API needs for live notifications (Server-Sent Events)                     | ✅ Done     |
| Web app                    | **Vercel** (Hobby)             | Made by the Next.js team; free for personal projects                                                              | ✅ Done     |
| Redis (BullMQ + pub/sub)   | **Render Key Value** (free)    | Same account and region as the API, over Render's private network; no command limit (BullMQ checks Redis all day) | ✅ Done     |
| Video interviews           | **LiveKit Cloud** (Build plan) | Same LiveKit the app uses locally, without the local UDP limits                                                   | ✅ Done     |
| Email                      | **Brevo** (free plan)          | About 300 emails a day for free, and needs no domain: a verified Gmail sender is enough                           | ✅ Done     |
| Google sign-in             | **Google Cloud** OAuth client  | Free; Jobify's API talks to Google directly, without an extra service in between                                  | ✅ Done     |
| Keep the API awake         | **cron-job.org** (optional)    | **Not used.** Pinging all day would keep Neon awake too and use up its free compute; see section 7                | ➖ Not used |

---

## 1. Neon: database and file storage

### Why Neon

- **Postgres, managed and free.** The app is built on Postgres and Prisma; Neon runs it without any
  server to look after. On the free plan the database pauses when idle and wakes in about a second.
- **File storage in the same project.** Neon Object Storage speaks the S3 API, which is what the app
  already uses for SeaweedFS locally. This replaced Cloudflare R2 from the original plan: one fewer
  account, and no card needed.
- **Region close to the users:** AWS Asia Pacific (Singapore), `ap-southeast-1`, the closest
  region to Bangladesh that also has Object Storage.
- **Branches:** a Neon branch is an instant copy of the database _and_ its files, useful for trying
  a migration or for preview deployments later without touching production.

Free-plan limits change over time; check [neon.com/pricing](https://neon.com/pricing).

### What was created

| Item           | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Region         | AWS Asia Pacific 1 (Singapore), `aws-ap-southeast-1`                        |
| Branch         | `production` (the default branch)                                           |
| Services       | Postgres + Object Storage (chosen in the project wizard)                    |
| Bucket         | `jobify`, **private** (every file is read through a short-lived signed URL) |
| Config in repo | [`neon.ts`](../neon.ts) declares the bucket and the branch policy           |

In the project wizard only **Object storage** was ticked. The other options aren't needed:

| Wizard option  | Picked | Reason                                                               |
| -------------- | ------ | -------------------------------------------------------------------- |
| Better Auth    | No     | Jobify has its own sign-in (argon2, httpOnly cookie sessions, roles) |
| Object storage | Yes    | CVs, profile photos, company logos and covers                        |
| Functions      | No     | The API and worker run on Render                                     |
| AI Gateway     | No     | The app doesn't call AI models (and it needs a paid plan)            |
| Realtime       | No     | Live notifications already go through Redis and Server-Sent Events   |

### How it was set up

**1. Install the Neon CLI**

```bash
npm i -g neon@latest
```

**2. Link the repo to the Neon project and create `neon.ts`**

From the repo root, with the org and project IDs shown in the Neon console:

```bash
neon init -y --org-id <org-id> --project-id <project-id> --branch production \
  --services postgres,object-storage
```

This wrote a git-ignored `.neon` file (which project and branch this folder is linked to) and
`neon.ts`. It also installed Neon's agent skills and plugin for coding assistants.

Two fixes were needed:

- `neon init` failed to add its config package because the repo is a pnpm workspace. Installed it at
  the workspace root instead: `pnpm add -w -D @neon/config`.
- The generated bucket was called `assets`; it was renamed to `jobify` in `neon.ts` to match
  `S3_BUCKET`.

**3. Provision the services**

```bash
neon deploy --no-env-pull
```

```
Applied changes
  + bucket jobify
Utilized services: Postgres, Object Storage
```

`--no-env-pull` stops Neon writing production values into the local `.env`, which must keep
pointing at the Docker services for development and tests.

**4. Save the production values to a separate, git-ignored file**

```bash
neon env pull --file .env.neon
```

`.env.neon` is covered by the `.env.*` rule in `.gitignore`. It contains:

| Neon variable                                | What it is                                                      |
| -------------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                               | **Pooled** connection (host ends in `-pooler`). Used by the app |
| `DATABASE_URL_UNPOOLED`                      | **Direct** connection. Used by Prisma migrations                |
| `AWS_ENDPOINT_URL_S3`                        | Storage endpoint for the branch                                 |
| `AWS_REGION`                                 | `ap-southeast-1`                                                |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Storage credentials                                             |
| `NEON_BRANCH`                                | The branch the values belong to                                 |

Never paste these values into chats, issues or commits. They go only in `.env.neon` and in the
hosting providers' settings.

**5. Wire the app to Neon**

- **Database driver:** the API is a long-running server, so it keeps using node-postgres (Prisma's
  `@prisma/adapter-pg`) on the **pooled** `DATABASE_URL`, as Neon recommends for this kind of host.
- **Migrations:** they fail over the pooled connection (PgBouncer), so
  [`packages/db/prisma.config.ts`](../packages/db/prisma.config.ts) uses `DATABASE_URL_UNPOOLED`
  when it's set and falls back to `DATABASE_URL` locally.
- **Storage:** no code change. The app reads `S3_*` settings, so Neon's values are mapped onto them:

| App setting            | Value                                            |
| ---------------------- | ------------------------------------------------ |
| `S3_ENDPOINT`          | `AWS_ENDPOINT_URL_S3`                            |
| `S3_REGION`            | `AWS_REGION`                                     |
| `S3_BUCKET`            | `jobify`                                         |
| `S3_ACCESS_KEY_ID`     | `AWS_ACCESS_KEY_ID`                              |
| `S3_SECRET_ACCESS_KEY` | `AWS_SECRET_ACCESS_KEY`                          |
| `S3_FORCE_PATH_STYLE`  | `true` (Neon only supports path-style addresses) |

The API doesn't create buckets in production (`NODE_ENV=production`); the bucket comes from `neon.ts`.

**6. Create the tables and load the demo data**

Load `.env.neon` into the shell, map the storage settings, then migrate and seed:

```bash
set -a; . ./.env.neon; set +a
export S3_ENDPOINT="$AWS_ENDPOINT_URL_S3" S3_REGION="$AWS_REGION" S3_BUCKET=jobify \
  S3_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" S3_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  S3_FORCE_PATH_STYLE=true
pnpm db:deploy   # 3 migrations, over the direct connection
pnpm db:seed     # demo data; demo CVs are uploaded to the bucket
```

Values exported in the shell take priority over the local `.env`, so this only affects that
terminal. Close it afterwards so later commands don't hit production by accident.

### How it was verified

With the shell from step 6, the production build of the API was started against Neon (local Redis):

```bash
PORT=4100 node apps/api/dist/main.js
```

| Check                                           | Result                                                      |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `pnpm db:deploy`                                | All migrations applied                                      |
| `pnpm db:seed`                                  | 8 companies, 60 jobs, 20 seekers, 53 applications, 18 tests |
| `GET /api/health`                               | `{"status":"ok","database":"up"}`                           |
| Log in as `seeker@jobify.dev`                   | 200                                                         |
| Open the seeded CV                              | Redirect to a signed URL on Neon storage; a valid PDF       |
| Upload a CV (`POST /api/me/cv`) and download it | Same SHA-256 before and after                               |
| Open the file without a session                 | 401                                                         |

The driver prints a warning that `sslmode=require` is treated as `verify-full` (the strictest
check). It's harmless.

### Day-to-day tasks

| Task                        | How                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| Reset the demo data         | Run step 6 again. `pnpm db:seed` wipes and reloads everything, files included                      |
| Ship a new migration        | Merge it, then run `pnpm db:deploy` from a shell set up as in step 6 (or from the deploy pipeline) |
| Get fresh connection values | `neon env pull --file .env.neon`, then update the hosting providers' settings                      |
| Change Neon services        | Edit `neon.ts`, then `neon deploy --no-env-pull`                                                   |
| Browse production data      | `pnpm db:studio` from a shell set up as in step 6, or the Neon console's SQL editor                |

---

## 2. Render: API, worker and Redis

### Why Render

- The API keeps connections open for live notifications (Server-Sent Events) and the worker runs
  all the time, so both need a host that runs **long-lived Node processes**. Serverless hosts such
  as Vercel Functions stop a request after a time limit.
- The **free web service** runs one always-on process (750 hours a month) and builds straight from
  GitHub on every push to `main`.
- **Render Key Value** (Redis-compatible) has a free plan in the same account and region, reached
  over Render's private network.

### What we use from Render

| Render product    | Used | What for                                                                     |
| ----------------- | ---- | ---------------------------------------------------------------------------- |
| Web Service       | Yes  | `jobify-api`: the API **and** the worker, free plan                          |
| Key Value         | Yes  | `jobify-redis`: BullMQ's queue and the notification channel, free plan       |
| Background Worker | No   | Not on the free plan. The worker runs inside the web service instead (below) |
| Postgres          | No   | Neon is the database                                                         |
| Cron Jobs         | No   | Not on the free plan. The worker schedules its own jobs                      |
| Static Site       | No   | The web app is on Vercel                                                     |

**Why the API and worker share one service:** the free plan has no background workers, and two
always-on free services would need about 1,440 hours a month against the 750 allowed. So
[`scripts/start-backend.mjs`](../scripts/start-backend.mjs) starts both as separate programs in one
container. If either one stops, it stops the other and exits, so Render restarts both. Stop
signals from Render reach both, so each finishes its current work before a deploy.

The service is described in [`render.yaml`](../render.yaml) (a Render Blueprint): build and start
commands, region, health check and every setting.

### Key Value (`jobify-redis`)

Created by hand in the dashboard (_New › Key Value_):

| Field            | Value                            | Why                                                                                    |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| Name             | `jobify-redis`                   |                                                                                        |
| Region           | **Singapore**                    | Must match the web service: private networking only works within a region              |
| Maxmemory policy | **`noeviction`**                 | BullMQ requires it. `allkeys-lru` would silently delete queue data when memory is full |
| Plan             | **Free** (25 MB, 50 connections) | The app uses about 5 connections and very little memory                                |
| Persistence      | None (free plan)                 | Nothing durable lives in Redis: the worker recreates its schedule on start             |

Its **Internal Key Value URL** (`redis://red-…:6379`, from the instance's _Connect_ menu) is the
web service's `REDIS_URL`. It only works from Render services in the same region; local development
keeps using Docker Redis.

### Web service (`jobify-api`)

**Create it from the Blueprint:** _New › Blueprint_ → connect the `4K45H107/JOBIFY` repo → Render
reads `render.yaml` and asks for the secret settings:

| Setting                                                | Value                                                                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                         | Neon **pooled** string (`DATABASE_URL` in `.env.neon`)                                                                      |
| `DATABASE_URL_UNPOOLED`                                | Neon **direct** string (used by migrations during the build)                                                                |
| `REDIS_URL`                                            | `jobify-redis`'s Internal Key Value URL                                                                                     |
| `S3_ENDPOINT`                                          | `AWS_ENDPOINT_URL_S3` from `.env.neon`                                                                                      |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`             | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` from `.env.neon`                                                               |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | From the LiveKit Cloud project                                                                                              |
| `BREVO_API_KEY`, `MAIL_FROM`                           | From Brevo, see [section 5](#5-brevo-email). Without the key, email is off                                                  |
| `WEB_ORIGIN`                                           | The Vercel URL, `https://jobify-hire.vercel.app`. Any valid URL works until Vercel exists; set the real one after section 3 |

These come from `render.yaml` and need no input: `NODE_ENV=production`, `NODE_VERSION=22`,
`TRUST_PROXY=true` (requests pass through Vercel and Render's load balancer), `S3_REGION`,
`S3_BUCKET=jobify`, `S3_FORCE_PATH_STYLE=true`, and `JWT_ACCESS_SECRET`, which Render generates.

What Render then does on every push to `main`:

```bash
# build
corepack pnpm install --frozen-lockfile --prod=false   # devDependencies are needed to build
corepack pnpm turbo run build --filter=@jobify/api --filter=@jobify/worker
corepack pnpm db:deploy   # migrations (no pre-deploy step on the free plan); retried once
# start
node scripts/start-backend.mjs
```

Render waits for `GET /api/health` to answer before sending traffic to a new version.

**Check it:** `https://<service>.onrender.com/api/health` returns `{"status":"ok","database":"up"}`,
and the logs show `[worker] running: interview reminders every minute`.

### What was created

| Item      | Value                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Blueprint | `jobify`, from `render.yaml` on `main`                                                                                         |
| Service   | `jobify-api`, free plan, Singapore: **https://jobify-api-g2kn.onrender.com** (`jobify-api` was taken, so Render added `-g2kn`) |
| Key Value | `jobify-redis`, free plan, Singapore, `noeviction`                                                                             |
| Deploys   | Automatically on every push to `main`                                                                                          |

### How it was verified

Before deploying, the exact build and start commands were run in a fresh clone with
`NODE_ENV=production`, against Neon and a local Redis:

- install, build and migrations succeeded. The first migration attempt failed once while Neon was
  waking up, which is why the build retries it.
- `/api/health` answered `database: up` and the worker logged its schedule.
- `SIGTERM` stopped both programs cleanly and the script exited.
- When one program failed to start, the script stopped the other and exited.

After deploying: the first build succeeded, `/api/health` returned `database: up`, demo logins work,
and the worker sent a live interview reminder (see [End-to-end check](#end-to-end-check-of-the-live-site)).

## 3. Vercel: web app

### Why Vercel

Vercel is made by the Next.js team and runs the web app with no configuration; the Hobby plan is
free for personal projects. The browser only talks to Vercel: `/api/*` is proxied to Render, so the
login cookies stay on the web app's own domain.

### How to set it up

_Add New › Project_ → import `4K45H107/JOBIFY`. Vercel detects both `apps/api` (NestJS) and
`apps/web` and offers to deploy them together as "Services": **don't**. The API runs on Render; on
Vercel it would become short-lived functions, which breaks live notifications and can't run the
worker. Instead set:

| Setting                    | Value                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| Root Directory             | `apps/web`                                                                     |
| Framework                  | Next.js (detected)                                                             |
| Build and install commands | Leave as they are: [`apps/web/vercel.json`](../apps/web/vercel.json) sets them |
| Environment variable       | `API_URL` = `https://jobify-api-g2kn.onrender.com` (no trailing slash)         |

`API_URL` is baked into the build (it's where `/api` is proxied), so after changing it, **redeploy**.
Then set `WEB_ORIGIN` on Render to the Vercel URL.

`vercel.json` installs the whole workspace and builds the web app with its shared package
(`turbo run build --filter=@jobify/web`). This was checked in a fresh clone with only `API_URL` set.

### What was created

| Item    | Value                                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project | `jobify`, Hobby plan, from `main`                                                                                                                                      |
| Domain  | **https://jobify-hire.vercel.app**, added under _Settings › Domains_ (free `vercel.app` name; the project also keeps Vercel's generated `jobify-sandy-six.vercel.app`) |
| Deploys | Production on every push to `main`; a preview build for every pull request (shown as a PR check)                                                                       |

After the domain was chosen, `WEB_ORIGIN` on Render was set to `https://jobify-hire.vercel.app`.

### Server time zone

Vercel renders pages on servers in **UTC**, while visitors see their own time zone. Text that
depends on the viewer's clock, time zone or locale (interview times, "3h ago", countdowns) is
therefore filled in only in the browser, through `ClientTime` and `useHydrated`
(`apps/web/src/components/ui/ClientTime.tsx`). Rendering it on the server too caused React
hydration errors on the interview pages (fixed in PR #30).

## 4. LiveKit Cloud: video interviews

### Why LiveKit Cloud

The app already uses LiveKit (a local server in Docker for development). LiveKit Cloud is the hosted
version: no server to run, no UDP or firewall issues, and a free Build plan. The API only creates
short-lived room tokens with the API key and secret; browsers connect to LiveKit directly.

### How it was set up

1. Signed up at [cloud.livekit.io](https://cloud.livekit.io) and created the project `jobify`. The
   onboarding questions are optional (answered "Web app" and "Video conferencing").
2. **Region: Europe.** Only US and Europe were offered; Europe is closer to Bangladesh. Calls are
   still routed through LiveKit's nearest edge servers.
3. **Agent observability: off.** It records LiveKit Agents (AI bots) sessions; Jobify has none, and
   leaving it off avoids storing interview data.
4. _Settings › API keys › Create key_. The **secret is shown only once**: copy it before closing
   the dialog. (The first key's secret was lost, so it was revoked and a new key created.)
5. Put the three values on Render (`jobify-api` › Environment):

| Setting              | Value                                 |
| -------------------- | ------------------------------------- |
| `LIVEKIT_URL`        | `wss://jobify-bxha3jvq.livekit.cloud` |
| `LIVEKIT_API_KEY`    | the key (`API…`)                      |
| `LIVEKIT_API_SECRET` | the secret                            |

Nothing else is needed from LiveKit: no Agents, telephony, Egress or recording.

### How it was verified

- Before putting the key on Render, it was checked against LiveKit's server API: creating, listing
  and deleting a room all succeeded (they fail with a wrong key or secret).
- On the live site, the seeker and the employer each got a join token for the same room, on the
  `wss://jobify-bxha3jvq.livekit.cloud` URL, signed with the new key.
- In the dashboard, _Sessions_ lists the rooms that were actually joined.

## 5. Brevo: email

The full email guide (what's sent, the code, settings, troubleshooting) is [EMAIL.md](EMAIL.md).

### Why Brevo

The worker emails people about their applications, tests, interviews and join requests. Brevo's
free plan sends about **300 emails a day** and, unlike Resend's free plan, works without owning a
domain: a single verified sender address is enough. Templates, the queue and retries live in the
app (`packages/email`, `apps/worker`), so the provider is only the last step and easy to swap.

### How it works

```mermaid
flowchart LR
    Event["API creates a notification<br/>(or the worker: reminders)"] --> Queue[["Redis queue: email"]]
    Queue --> Worker["Worker: check settings,<br/>render, send, log"]
    Worker -- "production" --> Brevo["Brevo API"]
    Worker -- "locally" --> Mailpit["Mailpit<br/>localhost:8025"]
```

- One email job per notification; the `EmailLog` table makes sending idempotent (a duplicate job
  sends nothing) and records skips and failures with the reason.
- Three tries, retried after 30 s and 1 min, if Brevo is briefly down.
- **Seeded demo accounts never get real email.** Their addresses are made up (some on real domains
  such as gmail.com), so the worker skips them whenever the provider is Brevo. Locally they still
  show up in Mailpit.
- Every email has a footer link to the email settings and a signed one-click unsubscribe link, plus
  the `List-Unsubscribe` headers mail apps use for their own unsubscribe button.
- Interview times are shown in `EMAIL_TIME_ZONE` (Asia/Dhaka), named in the email ("GMT+6").

### How to set it up

1. Sign up at [brevo.com](https://www.brevo.com) on the free plan.
2. _Settings › Senders, domains & dedicated IPs › Senders › Add a sender_: from name `Jobify`, from
   email the address to send from (e.g. your Gmail). Click the confirmation link Brevo emails you.
3. _Settings › SMTP & API › API keys › Generate a new API key_. It is shown only once.
4. On Render (`jobify-api` › Environment): `BREVO_API_KEY` = the key, `MAIL_FROM` =
   `Jobify <the-sender-address>`. Save and deploy.
5. Check the worker's log line: `emails via brevo`. Without the key it says
   `(off: BREVO_API_KEY not set)` and no email is attempted.

**Deliverability:** for a free sender such as `@gmail.com`, Brevo sends from an address on its own
domain (e.g. `…@12650113.brevosend.com`) so that Gmail's sender checks (SPF/DKIM/DMARC) pass; the
name "Jobify" still shows. The first test landed in the inbox. A domain of your own, verified in
Brevo, would make the sender address match exactly; it's optional for a demo.

### How to test it

Register a new account with an address you own (demo accounts are skipped), then trigger an email:
for example apply to a job as a seeker (the employer gets "New applicant"), or ask to join a
company. Brevo's _Transactional › Logs_ shows what was sent.

_Status: on since 2 Nov 2026 (key and sender set on Render; checked live)._

## 6. Google sign-in

### How it works

"Continue with Google" on the sign-in and sign-up pages. The browser goes to Google, comes back to
`/api/auth/google/callback` (through Vercel's `/api` proxy, so the session cookies are set on the
web app's domain), and the API signs the person in with its usual session.

- **Safety:** state (against forged returns), PKCE (the code is useless without our verifier) and
  a nonce; Google's ID token is checked against Google's published keys.
- **Accounts:** a known Google account signs in; an email that already has an account gets Google
  linked to it (only if Google has verified the email); a new email becomes a new, already verified
  account, after asking "looking for a job or hiring?" when started from the sign-in page.
- Google-only accounts have no password; they can add one with "Forgot password" (or from
  _Settings › Account settings_).
- **Off until configured:** without `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, the button is
  hidden. Code: [`google.service.ts`](../apps/api/src/auth/google.service.ts).

Why not Auth0: Jobify already has its own sessions, verification and reset, so Auth0 would only sit
between Jobify and Google, and a live site needs your own Google OAuth client either way.

### How to set it up

In [Google Cloud Console](https://console.cloud.google.com) (free):

1. **Create a project**, e.g. `Jobify`.
2. **Google Auth Platform › Get started** (the OAuth consent screen): app name `Jobify`, your email
   as support and contact email, audience **External**.
3. **Audience:** while the app is in **Testing**, only the test users you list can sign in. To let
   anyone sign in, **Publish app**. Publishing needs, on the **Branding** page: app name, support email, homepage
   (`https://jobify-hire.vercel.app`) and privacy policy (`https://jobify-hire.vercel.app/privacy`),
   plus the authorized domain `jobify-hire.vercel.app`. Jobify only asks for the basic `openid`, `email` and `profile`
   scopes, which don't need Google's review.
4. **Clients › Create client** › type **Web application**:

   | Field                         | Values                                                                                                         |
   | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
   | Authorized JavaScript origins | `https://jobify-hire.vercel.app` and `http://localhost:3000`                                                   |
   | Authorized redirect URIs      | `https://jobify-hire.vercel.app/api/auth/google/callback` and `http://localhost:3000/api/auth/google/callback` |

5. Copy the **Client ID** and **Client secret**. On Render (`jobify-api` › Environment) set
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then save and deploy. To try it locally too, put
   the same two values in your local `.env`.
6. **Check:** the sign-in page shows "Continue with Google". Sign in with your Google account (the
   same email as an existing account links to it).

The redirect URI must match exactly (`https`, no trailing slash); a mismatch shows Google's
`redirect_uri_mismatch` error.

_Status: on since 2 Nov 2026. The app is published (anyone can sign in), with the homepage and privacy policy (`/privacy`) set on Google's Branding page, and the client ID and secret on Render. Checked live: Google's sign-in screen opens for jobify-hire.vercel.app._

## 7. Known limitations: sleeping on the free tier

### What happens

Render's free web service **sleeps after 15 minutes without traffic**, and wakes on the next
request. Neon's database then sleeps too, 5 minutes later. This is accepted, with two consequences:

| Effect                                                                                                                             | Impact                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cold start**: the first visit after a quiet spell waits about 30–60 s while Render starts the API (plus about a second for Neon) | A visitor opening the demo link may see a slow first page, and the very first server-rendered page may time out once before a reload works. Later requests are fast                                                                     |
| **Interview reminders pause** while it sleeps: the worker runs inside the same service                                             | A reminder due while nobody uses the site isn't sent. While anyone is on the site, their open notification stream keeps the service awake, so reminders work during real use. Nothing is lost: interviews and notifications are in Neon |

**Tip:** before sharing the link (in an application or an interview), open
https://jobify-hire.vercel.app or `https://jobify-api-g2kn.onrender.com/api/health` a minute ahead
to wake it up.

### Why there's no keep-awake ping

A free [cron-job.org](https://cron-job.org) job pinging `/api/health` every 10 minutes would keep
Render awake all month, about 744 of Render's 750 free hours. It was **deliberately not set up**:

- **Neon would never sleep either.** While the API is awake, the worker queries the database every
  minute for upcoming interviews, so Neon stays active. Measured on the first day: about
  0.25 compute units while active. Around the clock that is roughly 730 h × 0.25 ≈ **180
  compute-unit hours a month**, above Neon's free monthly compute allowance (check the current
  figure at [neon.com/pricing](https://neon.com/pricing) or in the console under _Usage_). Running out
  would suspend the database until the month resets, which is far worse than a slow first visit.
- **A portfolio demo is used in short bursts**, during which the service is awake anyway.

### If it's ever needed

- **A narrow schedule** avoids the compute problem: e.g. weekdays 10:00–18:00 (Asia/Dhaka), every
  10 minutes, is about 40 hours of uptime a month. cron-job.org → _Create cronjob_ → URL
  `https://jobify-api-g2kn.onrender.com/api/health` → custom schedule. Check the job's history shows
  `200`.
- **Paid plans** remove the limitation: Render's paid instances don't sleep, and a separate worker
  service could run on its own.
- **Lighter worker polling** would let Neon sleep while the API is up: schedule each reminder as a
  BullMQ delayed job instead of querying every minute (see the alternatives in
  [WORKER.md](WORKER.md#alternatives-we-could-have-used)).

---

## End-to-end check of the live site

Run against https://jobify-hire.vercel.app after everything was deployed:

| Check                                  | Result                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Open `/` signed out                    | Redirects to `/login`                                                                                                        |
| `/api/health` through the Vercel proxy | `{"status":"ok","database":"up"}`                                                                                            |
| Sign in as seeker and as employer      | 200; Chrome shows Home with "For you" jobs, 60 jobs and 8 companies                                                          |
| Upload a CV, then open it              | 201, then a redirect to a signed Neon Storage URL; the downloaded file is byte-identical; 401 without a session              |
| Live notification                      | The employer schedules an interview; the seeker's open stream receives "Interview scheduled" about 2 s later, through Vercel |
| Worker                                 | The seeker's stream also receives "Interview starting soon" from the worker on Render                                        |
| Video room                             | Seeker and employer get tokens for the same LiveKit room                                                                     |
| Times                                  | No hydration errors with a UTC server and a browser in Asia/Dhaka (after PR #30)                                             |

The test interviews were cancelled afterwards. To reset all demo data, see
[Day-to-day tasks](#day-to-day-tasks) in the Neon section.

## Where the settings live

All production values are kept in the git-ignored `.env.production` on the owner's machine (and in
a password manager), and in each provider's dashboard. Nothing secret is committed.
