# Running Jobify locally

This gets the whole app (web, API, background worker and the services they need) running on your
machine with demo data, in about five minutes.

## 1. Requirements

| Tool    | Version     | Notes                                                                            |
| ------- | ----------- | -------------------------------------------------------------------------------- |
| Node.js | 22 or newer | `.nvmrc` says 22. `nvm use` picks it up                                          |
| pnpm    | 10          | Comes with Node through Corepack: `corepack enable`                              |
| Docker  | Any recent  | Docker Desktop, or Colima on macOS. Runs Postgres, Redis, S3 storage and LiveKit |

## 2. First-time setup

```bash
git clone https://github.com/4K45H107/JOBIFY.git jobify
cd jobify
corepack enable          # makes the right pnpm version available
pnpm install
cp .env.example .env     # local defaults; works as-is
pnpm services:up         # starts Postgres, Redis, SeaweedFS (S3) and LiveKit in Docker
pnpm db:deploy           # creates the database tables
pnpm db:seed             # demo companies, jobs, people, applications, tests and interviews
```

## 3. Start the app

```bash
pnpm dev
```

This starts three processes:

| What               | URL                                               |
| ------------------ | ------------------------------------------------- |
| Web app            | http://localhost:3000                             |
| API                | http://localhost:4000/api                         |
| API docs (Swagger) | http://localhost:4000/api/docs                    |
| Worker             | no URL; it sends interview reminders every minute |

Open http://localhost:3000 and sign in with one of the demo accounts below.

## 4. Demo accounts

**Every demo account uses the password `Password123!`**

### Main accounts

| Email                 | Role                                  | What's set up for it                                                                                                                                       |
| --------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seeker@jobify.dev`   | Job seeker (Ayesha Rahman)            | Full profile, CV, skills and preferences ("For You" works), saved jobs, applications in several stages, skill tests to take, an interview in about 2 hours |
| `employer@jobify.dev` | Employer, **admin** of Northwind Labs | Northwind's jobs with applicants, test scores and CVs, a pending join request to approve, interviews on the schedule                                       |
| `admin@jobify.dev`    | Platform admin                        | Account only. The admin panel is a later phase                                                                                                             |

### More accounts for specific flows

| Email                                              | Role                                                 | Use it to try                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `donny19@northwind-labs.example.com`               | Employer, **recruiter** at Northwind Labs            | The read-only company view (only the admin can edit the company or approve members)                |
| `new.recruiter@example.com`                        | Employer, join request **pending** at Northwind Labs | The "waiting for approval" screen. Approve them as `employer@jobify.dev` under _My Company › Team_ |
| `dr.vandervort20@brightpath-analytics.example.com` | Employer, admin of Brightpath Analytics              | A second company, to check one company can't see another's applicants                              |
| `paxton_armstrong@gmail.com`                       | Job seeker                                           | Has interviews scheduled with Northwind                                                            |
| `mrs.39@hotmail.com`                               | Job seeker                                           | Applications spread across many stages (shortlisted, testing, interview, rejected)                 |

The seed always produces the same data, so these emails stay the same every time you run
`pnpm db:seed`. Running it again resets everything to the demo state.

You can also create your own accounts on the **Create account** page. Pick "I'm looking for a job"
or "I'm hiring".

## 5. Things to try

**Apply and take a skill test (seeker)**

1. Sign in as `seeker@jobify.dev`. Home shows jobs picked "For you" with the reasons.
2. _Explore › Jobs_: open a Northwind job marked "Includes a skill test" that you haven't applied to.
3. **Easy Apply**: contact info, then CV, then the employer's questions, then **Take the test**.
4. Answer the timed questions. The score shows up under _Activities › Applications_.

**Review applicants and schedule an interview (employer)**

1. Sign in as `employer@jobify.dev` and open a job on _Home_, then **Review applicants**.
2. Sort by _Marks_, open a CV, **Shortlist** someone, then **Schedule interview**.
3. Add a skill test to another job with **Add skill test +**.

**Live notifications and a video interview (two browsers)**

1. Use a normal window and a private window (or two browsers), one per account.
2. Schedule an interview 2–3 minutes from now for a shortlisted applicant. The applicant's bell
   updates without a reload. You can find the applicant's email under _Show answers, contact and
   history_.
3. The room opens 10 minutes before the start. Both people click **Join** under _Interviews_ to
   meet in the LiveKit room. The employer can **End interview**.

**Company onboarding**

- Register a new employer: you'll be asked to create a company or ask to join one.
- Sign in as `new.recruiter@example.com` to see a pending request, and approve it as
  `employer@jobify.dev`.

## 6. Other commands

| Command                                                                                                                      | What it does                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `pnpm db:seed`                                                                                                               | Reset all data to the demo state                          |
| `pnpm db:studio`                                                                                                             | Browse the database in Prisma Studio                      |
| `pnpm services:down`                                                                                                         | Stop the Docker services (data is kept in Docker volumes) |
| `pnpm test`                                                                                                                  | All tests. API tests need the services running            |
| `pnpm lint` / `pnpm typecheck`                                                                                               | Static checks                                             |
| `pnpm build` then `pnpm --filter @jobify/web start`, `pnpm --filter @jobify/api start`, `pnpm --filter @jobify/worker start` | Production builds                                         |

## 7. Ports and services

| Service            | Port                                                           | Change it with (in `.env`)             |
| ------------------ | -------------------------------------------------------------- | -------------------------------------- |
| Postgres           | 5433 (not 5432, to avoid clashing with another local Postgres) | `POSTGRES_PORT` + `DATABASE_URL`       |
| Redis              | 6379                                                           | `REDIS_PORT` + `REDIS_URL`             |
| SeaweedFS (S3 API) | 8333                                                           | `S3_PORT` + `S3_ENDPOINT`              |
| LiveKit            | 7880 (plus 7881, 7882/udp)                                     | `LIVEKIT_PORT` + `LIVEKIT_URL`         |
| Web                | 3000                                                           | `apps/web/package.json`                |
| API                | 4000                                                           | `PORT` (and `API_URL` for the web app) |

## 8. Troubleshooting

**`docker compose` isn't found, or `pnpm services:up` fails straight away**
Some installs (for example Colima, or a removed Docker Desktop) only have the standalone command.
Run it directly instead:

```bash
docker-compose up -d --wait
```

**`error getting credentials … docker-credential-desktop` when pulling images (Colima)**
`~/.docker/config.json` still points at Docker Desktop's credential helper. Remove the
`"credsStore": "desktop"` line from that file, or install Docker Desktop's helper.

**`port is already allocated`**
Another container or app uses that port. Pick another one in `.env` (see the table above) and
start the services again.

**Pages show a 429 "Too Many Requests" error**
Sign-in and registration are rate-limited (10 attempts a minute per visitor). Wait a minute, or
restart the API (`pnpm dev` again) to reset the counters.

**The web app can't reach the API after changing `API_URL`**
The web app's `/api` proxy target is fixed when the web app is **built**. In development it's
read on start, so restart `pnpm dev`. For production builds, set `API_URL` before `pnpm build`.

**The video room connects but the camera stays off**
The browser needs permission for the camera and microphone. On some Docker setups (e.g. Colima)
the media traffic (UDP) can't reach the local LiveKit server, so people see each other's names
but no video. The rest of the app is unaffected, and LiveKit Cloud doesn't have this limit.

**Start completely fresh**

```bash
pnpm services:down
docker volume rm jobify_postgres-data jobify_seaweedfs-data   # deletes all local data
pnpm services:up && pnpm db:deploy && pnpm db:seed
```
