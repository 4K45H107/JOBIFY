# Jobify: Rebuild Plan

> A rebuild of **Jobify**, the CSE408 (BUET) team project from Jan–Mar 2024
> ([original repo](https://github.com/4K45H107/CSE408_JOBIFY)).
> The UI follows the original [Figma design](https://www.figma.com/design/MJg6o8oT8Tp7aBM8Zx8Qfe/JOBIFY.).
> The goal this time is to finish the full scope, make it secure, and deploy it.

**Status:** planning · **Last updated:** 2026-10-29

### Starting point (this repo today)

| Branch                 | Contents                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `main` / `development` | Create Next App scaffold: Next.js 15.4, React 19, TypeScript, Tailwind v4 (Aug 2025)                                   |
| `feat/auth-system`     | UI-only login and register pages under `src/app/(auth)/` (no backend; submit is a TODO). **Downgrades Tailwind to v3** |

Phase 0 below moves this app into `apps/web/` and keeps the auth pages. Pick one Tailwind version (v4 recommended) before merging `feat/auth-system`.

---

## 1. Product overview

Jobify is a two-sided hiring platform. **Job seekers** find jobs and apply.
**Employers** post jobs, then screen, test and interview candidates. The whole pipeline lives in one app:

```
Discover → Easy Apply (contact · CV · screening Qs) → MCQ test → Coding test
        → Shortlist → Scheduled interview (video + whiteboard) → Offer / Reject
                         ↑ notifications (in-app + email) at every step ↑
```

### Roles

| Role               | Description                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Seeker**         | Builds a profile, searches for jobs, applies, takes tests, joins interviews                                       |
| **Employer**       | Belongs to a company. Posts and manages jobs, reviews applicants, runs interviews                                 |
| **Company admin**  | The employer who created the company. Approves or rejects employers who ask to join it. Edits the company profile |
| **Platform admin** | Moderates companies, reviews and users (minimal admin panel)                                                      |

---

## 2. Feature plan

Priority: **P0** = MVP (needed for a working demo) · **P1** = full 2024 scope · **P2** = stretch.
The Figma column names the frame each feature's UI comes from.

### 2.1 Accounts & auth

| Feature                                                                | Priority | Figma                         |
| ---------------------------------------------------------------------- | -------- | ----------------------------- |
| Sign up / log in as seeker or employer (email + password, hashed)      | P0       | — (2024 code)                 |
| Sessions: httpOnly cookies, access + refresh tokens, role-based guards | P0       | —                             |
| Google / GitHub OAuth                                                  | P1       | —                             |
| Email verification, forgot/reset password, change password             | P1       | Profile → Account Settings    |
| Email notification preferences                                         | P1       | Profile → Email Notifications |

### 2.2 Seeker

| Feature                                                                                            | Priority    | Figma                          |
| -------------------------------------------------------------------------------------------------- | ----------- | ------------------------------ |
| Home: hero search (job + location), platform stats                                                 | P0          | `Home`                         |
| Explore Jobs, **For You**: recommendations from preferences and skills                             | P0          | `Explore - Jobs - For You`     |
| Explore Jobs, **Search**: Trending / Latest, filters (type, salary, location, company), pagination | P0          | `Explore - Jobs - Search`      |
| Job details page, similar jobs                                                                     | P0          | (2024 code)                    |
| Explore **Companies**: search, company cards (rating, reviews, size, industry, location)           | P0          | `Explore - Companies`          |
| Company profile: overview, stats, mission, HQ, open jobs                                           | P0          | `Company Profile`              |
| Profile: info, skills, education, job preferences, photo, CV upload                                | P0          | `Profile`                      |
| **Easy Apply wizard**: 1) contact info 2) CV/resume 3) employer screening questions                | P0          | `Easy Apply 1–3`               |
| Activities, **Saved** jobs (save/remove)                                                           | P0          | `Activities - Saved`           |
| Activities, **Applications** with status and counts (ongoing / interview / rejected)               | P0          | `Activities - Applications`    |
| Activities, **Recent searches**                                                                    | P1          | `Activities - Recent Searches` |
| Activities, **Job Alerts**: saved searches with "N new" badges and email digests                   | P1          | `Activities - Job Alerts`      |
| **MCQ exam** (timed, one attempt, answers never sent to the client)                                | P0          | `MCQUser`                      |
| **Coding test**: problem statement, Monaco editor, run against sample tests, submit                | P2          | `code`                         |
| Interviews list: upcoming, countdown ("2 hrs remaining"), stage, join                              | P0          | `Interviews`                   |
| Profile dashboard: application stats, weekly activity chart                                        | P1          | `Profile`                      |
| Learning hours / My Courses / Contributions                                                        | P2 (or cut) | `Profile`                      |
| Company reviews & ratings (write and read)                                                         | P2          | `Company Profile`              |

### 2.3 Employer

| Feature                                                                                        | Priority | Figma                              |
| ---------------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| Onboarding: create a company (you become its admin) **or** request to join one                 | P0       | (2024 code)                        |
| Join-request approval / rejection (company admin)                                              | P0       | (2024 code)                        |
| Home: **My Company Jobs** / **My Offerings**                                                   | P0       | `Employer Home`                    |
| Add / edit / close job: title, type, salary, location, brief, age range, screening questions   | P0       | `AddJobs`                          |
| Attach **MCQ test** to a job (question builder, responses view)                                | P0       | `ADD MCQ`                          |
| Attach **coding problem** (description, test cases)                                            | P2       | employer `Interviews`              |
| **Job management**: applicants list with CV, test score, experience, date. **Sort and filter** | P0       | `Job Management`                   |
| Move applicant through stages: shortlist / reject / offer                                      | P0       | `Job Management`                   |
| **Schedule interview** (date, time, duration, stage). Both sides notified                      | P0       | `Job Management` (Schedule dialog) |
| Interview schedule page                                                                        | P0       | employer `Interviews`              |
| My Company: edit profile, branches, employees                                                  | P1       | `Company Profile employer`         |

### 2.4 Interviews (shared)

| Feature                                                         | Priority | Figma              |
| --------------------------------------------------------------- | -------- | ------------------ |
| Video call room (opens at the scheduled time, employer ends it) | P0       | `Zoom`             |
| Collaborative **whiteboard** in the call                        | P2       | `Zoom White Board` |
| Shared code editor in the call (reuses the coding-test editor)  | P2       | `code`             |

### 2.5 Platform

| Feature                                                                                   | Priority |
| ----------------------------------------------------------------------------------------- | -------- |
| Real-time in-app notifications + unread badge (bell in the header)                        | P0       |
| Global search bar in the header (jobs + companies)                                        | P1       |
| Email notifications (applied, test assigned, interview scheduled/reminder, status change) | P1       |
| Platform admin panel (users, companies, reported reviews)                                 | P2       |
| Seed script with demo companies, jobs and accounts                                        | P0       |

---

## 3. Architecture

### Decision: **modular monolith**, not microservices

|                 | Microservices                                                          | **Modular monolith (chosen)**                                                                         |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Team size       | Fits many teams owning services                                        | Fits 1–3 developers                                                                                   |
| Ops cost        | Many deploys, service discovery, distributed tracing, network failures | One API deploy + one worker                                                                           |
| Data            | A database per service, eventual consistency                           | One Postgres. The application → test → interview flow stays transactional                             |
| Portfolio value | Hard to finish. Often half-built                                       | Clean module boundaries show the same design skill, and it actually ships                             |
| Migration path  | —                                                                      | Modules talk through service interfaces and domain events, so any one of them can be pulled out later |

The hiring pipeline is strongly relational: an application owns test attempts, which feed shortlisting, which leads to interviews.
Splitting that across services gives distributed-transaction pain for no benefit at this scale.

**The exception is code execution, which runs as a separate isolated service.** Running untrusted user code must never happen inside the API process.
It goes to a sandboxed runner (self-hosted **Judge0** or a hosted equivalent). This is a security boundary, not a scaling choice.

### High-level diagram

```
                         ┌────────────────────────────┐
  Browser ──HTTPS──────▶ │  apps/web  (Next.js)       │  UI from Figma, SSR/RSC
                         └─────────────┬──────────────┘
                                       │ REST (OpenAPI) + WebSocket
                         ┌─────────────▼──────────────┐
                         │  apps/api  (NestJS)        │  modular monolith
                         │  ├ auth      ├ jobs        │
                         │  ├ users     ├ applications│
                         │  ├ companies ├ assessments │
                         │  ├ interviews├ notifications│
                         │  └ search    └ admin       │
                         └──┬────────┬────────┬───────┘
                            │        │        │ enqueue
                   ┌────────▼──┐ ┌───▼────┐ ┌─▼──────────────┐
                   │ PostgreSQL│ │ Redis  │ │ apps/worker    │ emails, job alerts,
                   │ (Prisma)  │ │ cache/ │ │ (BullMQ)       │ reminders, grading
                   └───────────┘ │ queues │ └─┬──────────────┘
                                 └────────┘   │
        External:  Object storage (R2/S3) · Email (Resend) · Video (LiveKit)
                   Code runner (Judge0, isolated) · OAuth (Google/GitHub)
```

### Tech stack

| Layer                | Choice                                                                                         | Why                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Monorepo             | **pnpm workspaces + Turborepo**                                                                | Shared types and config, one repo, cached builds                    |
| Language             | **TypeScript** everywhere                                                                      | Shared DTOs/types between web and api                               |
| Frontend             | **Next.js (App Router)** + **Tailwind** + **shadcn/ui**                                        | Matches the 2024 stack, quick to build Figma screens                |
| Data fetching        | **TanStack Query** + typed API client generated from OpenAPI                                   | Typed end to end                                                    |
| Forms / validation   | **react-hook-form + Zod** (schemas shared in `packages/shared`)                                | Same validation on client and server                                |
| Backend              | **NestJS**                                                                                     | Built-in module system fits a modular monolith. Guards, DI, OpenAPI |
| Database             | **PostgreSQL + Prisma**                                                                        | Relational data. Replaces the unindexed Mongo string IDs from 2024  |
| Search               | Postgres full-text + trigram (MVP) → Meilisearch (later, if needed)                            | Start simple                                                        |
| Queue / cache        | **Redis + BullMQ**                                                                             | Emails, alert digests, interview reminders                          |
| Realtime             | **Socket.IO** gateway in the API                                                               | Notifications, interview room presence                              |
| Auth                 | Own JWT (access + refresh) in **httpOnly cookies**, argon2 hashing, OAuth via Passport         | Fixes the 2024 localStorage/plaintext problems                      |
| File storage         | **Cloudflare R2** (S3 API), pre-signed uploads                                                 | CVs, photos, logos                                                  |
| Video                | **LiveKit** (Cloud free tier) — Agora as fallback                                              | Open source, good React SDK, server-issued tokens                   |
| Whiteboard           | **tldraw** (or Excalidraw) synced via Yjs                                                      | P2                                                                  |
| Code editor / runner | **Monaco** + **Judge0**                                                                        | P2                                                                  |
| Email                | **Resend** + React Email templates                                                             |                                                                     |
| Testing              | Vitest (unit), Supertest (API e2e), Playwright (UI e2e)                                        |                                                                     |
| CI/CD                | GitHub Actions: lint, typecheck, test, build. Preview deploys                                  |                                                                     |
| Hosting              | Web → **Vercel** · API + worker → **Railway/Render/Fly** · DB → **Neon** · Redis → **Upstash** | Free/cheap tiers                                                    |

### Repository layout

```
jobify/
├─ apps/
│  ├─ web/            # Next.js frontend (Figma screens)
│  ├─ api/            # NestJS modular monolith
│  └─ worker/         # BullMQ processors (same codebase modules, separate process)
├─ packages/
│  ├─ db/             # Prisma schema, migrations, generated client, seed
│  ├─ shared/         # Zod schemas, DTO types, enums (roles, statuses)
│  ├─ api-client/     # generated from the API's OpenAPI spec
│  └─ config/         # eslint, tsconfig, tailwind preset
├─ docs/              # ADRs, diagrams, screenshots
└─ docker-compose.yml # postgres, redis, (judge0) for local dev
```

### API modules (bounded contexts)

| Module          | Owns                                                             |
| --------------- | ---------------------------------------------------------------- |
| `auth`          | credentials, OAuth, sessions, refresh tokens, email verification |
| `users`         | seeker profile, skills, education, preferences, CV               |
| `companies`     | company, branches, memberships, join requests, reviews           |
| `jobs`          | job postings, screening questions, saved jobs, recent views      |
| `search`        | job/company search, recommendations ("For You"), job alerts      |
| `applications`  | applications, stage transitions (state machine), answers         |
| `assessments`   | MCQ tests, coding problems, attempts, grading                    |
| `interviews`    | scheduling, rooms, video tokens, whiteboard sessions             |
| `notifications` | in-app feed, realtime push, email dispatch, preferences          |
| `admin`         | moderation                                                       |

Modules only talk through exported services or domain events (e.g. `ApplicationSubmitted` → assessments creates a test attempt → notifications fans out).
No module touches another module's tables directly.

### Core data model (draft)

```
User(id, email, passwordHash, role[SEEKER|EMPLOYER|ADMIN], emailVerifiedAt, ...)
SeekerProfile(userId, fullName, phone, birthdate, location, education, headline, cvKey, photoKey)
  Skill(id, name) ⟷ SeekerSkill
  JobPreference(userId, locations[], jobTypes[], minSalary)
Company(id, name, slug, industry, size, foundedYear, website, hq, description, mission, logoKey, coverKey)
  CompanyMember(companyId, userId, role[ADMIN|RECRUITER], status[PENDING|ACTIVE|REJECTED])
  CompanyBranch(id, companyId, name, city, country)
  CompanyReview(id, companyId, authorId, rating, title, body)            -- P2
Job(id, companyId, postedById, title, type[FULL_TIME|PART_TIME|CONTRACT|INTERNSHIP],
    workplace[ONSITE|REMOTE|HYBRID], country, city, salaryMin, salaryMax, ageMin, ageMax,
    description, status[DRAFT|OPEN|CLOSED], deadline, createdAt)
  ScreeningQuestion(id, jobId, prompt, kind[YES_NO|TEXT|NUMBER], required)
SavedJob(userId, jobId) · RecentView(userId, jobId, viewedAt) · JobAlert(userId, query, filters, lastNotifiedAt)
Application(id, jobId, seekerId, cvKey, contact json, stage[APPLIED|TESTING|SHORTLISTED|INTERVIEW|OFFER|REJECTED|WITHDRAWN], createdAt)
  ScreeningAnswer(applicationId, questionId, answer)
Assessment(id, jobId, kind[MCQ|CODING], timeLimitMin)
  McqQuestion(id, assessmentId, prompt, options json, correctIndex)        -- correctIndex never leaves the API
  CodingProblem(id, assessmentId, statement, languageIds[], testCases json) -- P2
  Attempt(id, assessmentId, applicationId, startedAt, submittedAt, score, answers json)
Interview(id, applicationId, stage, scheduledAt, durationMin, status[SCHEDULED|LIVE|COMPLETED|CANCELLED], roomName)
Notification(id, userId, type, payload json, readAt, createdAt)
```

---

## 4. Frontend from Figma

The Figma file has 26 frames on Page 1. Two layout shells cover everything:

- **Seeker shell:** black top bar (logo, search, bell, avatar) + grey left sidebar (Home, Explore, Activities, Interviews, Settings)
- **Employer shell:** same top bar + sidebar (Home, Add Jobs, Explore, My Company, Interview schedule, Settings)

### Screen → route map

| Figma frame                                             | Route                                            |
| ------------------------------------------------------- | ------------------------------------------------ |
| Home                                                    | `/` (seeker home)                                |
| Explore - Jobs - For You / Search                       | `/explore/jobs?tab=for-you\|search`              |
| Explore - Companies                                     | `/explore/companies`                             |
| Company Profile                                         | `/companies/[slug]`                              |
| Activities - Recent / Job Alerts / Saved / Applications | `/activities/[tab]`                              |
| Easy Apply 1–3                                          | `/jobs/[id]/apply` (stepper)                     |
| MCQUser                                                 | `/assessments/[attemptId]`                       |
| code                                                    | `/assessments/[attemptId]/coding` (P2)           |
| Interviews (seeker)                                     | `/interviews`                                    |
| Zoom / Zoom White Board                                 | `/interviews/[id]/room`                          |
| Profile                                                 | `/profile`, `/settings/*`                        |
| Employer Home                                           | `/employer`                                      |
| AddJobs                                                 | `/employer/jobs/new`, `/employer/jobs/[id]/edit` |
| ADD MCQ                                                 | `/employer/jobs/[id]/assessment`                 |
| Job Management                                          | `/employer/jobs/[id]/applicants`                 |
| Interviews (employer)                                   | `/employer/interviews`                           |
| Company Profile employer                                | `/employer/company`                              |

**Not in Figma, so design these to match the same style:** login, register (seeker/employer), company onboarding (create/join), notifications panel, job details, settings subpages, empty/error/loading states, mobile layouts.

### Process

1. Pull design tokens (colours, type scale, radii, spacing) from Figma into `packages/config/tailwind` + CSS variables. Support light and dark.
2. Build shared components first (`apps/web/src/components`; promote to a `packages/ui` package only if a second app needs them): AppShell, Sidebar, TopBar, JobCard, CompanyCard, FilterPanel, Tabs, Stepper, StatCard, ApplicantRow, NotificationItem, EmptyState.
3. Build screens against a mocked API (MSW) so the frontend isn't blocked on the backend.
4. Use the Figma MCP (`get_design_context` per frame) to generate a reference, then adapt it to the shared components rather than pasting it in.
5. Make it responsive. The Figma frames are 1440px desktop only, so define tablet and mobile breakpoints ourselves.

---

## 5. Implementation plan

Rough estimates are for one developer working part-time. Every phase ends with something deployed and demo-able.

### Phase 0: Foundations (week 1)

- [x] Monorepo scaffold (pnpm, Turborepo, TS, ESLint, Prettier), `docker-compose` (Postgres, Redis)
- [x] Move the existing Next.js scaffold into `apps/web/` and settle on Tailwind v4 (the `feat/auth-system` pages get ported in Phase 1)
- [x] NestJS app with config, health check, OpenAPI, global error format, request validation
- [x] Prisma schema v1 + migrations + **seed script**
- [x] Next.js app with Tailwind + Figma design tokens + both app shells
- [x] CI: lint, typecheck, test, build (GitHub Actions + gitleaks secret scan)
- [ ] Deploy skeleton to Vercel + Railway + Neon (needs the owner's hosting accounts)
- [ ] `.env.example`, secrets only in the hosting provider (never committed)

### Phase 1: Auth & profiles (week 2)

- [ ] Register/login/logout, argon2 hashing, JWT access+refresh in httpOnly cookies, role guards
- [ ] Seeker profile + preferences + skills. CV/photo upload via pre-signed R2 URLs
- [ ] Employer onboarding: create company or request to join. Admin approves/rejects
- [ ] Screens: login, register, onboarding, `Profile` (info part), `Company Profile employer`

### Phase 2: Jobs & discovery (weeks 3–4)

- [ ] Employer: create/edit/close jobs (`AddJobs`), Employer Home lists
- [ ] Job search API: filters, sort (trending/latest), pagination, Postgres full-text
- [ ] "For You" recommendations v1 (score by skills, preferred type, location, salary)
- [ ] Companies search + company profile
- [ ] Saved jobs, recent views
- [ ] Screens: `Home`, `Explore - Jobs` (both tabs), `Explore - Companies`, `Company Profile`, job details, `Activities - Saved/Recent`

### Phase 3: Apply & screen (weeks 5–6)

- [ ] Easy Apply wizard (contact → CV → screening answers). Duplicate guard
- [ ] Application state machine + stage history
- [ ] MCQ builder (`ADD MCQ`), timed MCQ attempt (`MCQUser`), server-side grading
- [ ] Applicants view (`Job Management`): CV viewer, score, sort/filter, stage actions
- [ ] `Activities - Applications` with status counts
- [ ] Notifications module: in-app feed + Socket.IO push + bell badge

### Phase 4: Interviews (week 7)

- [ ] Schedule dialog (date/time/duration/stage). Clash check
- [ ] Interview lists for both roles with countdown
- [ ] LiveKit room: server-issued tokens, opens only near the scheduled time, employer ends it
- [ ] Worker: email + in-app reminders (24h / 15min)

### Phase 5: Retention & polish (week 8)

- [ ] Job Alerts (saved searches + daily digest via worker)
- [ ] Email templates for all key events. Notification preferences
- [ ] Profile dashboard stats + weekly activity chart
- [ ] Global header search
- [ ] Empty/loading/error states, accessibility pass, responsive layouts
- [ ] Playwright e2e of the golden path (seeker applies → test → interview scheduled)

### Phase 6: Stretch (P2)

- [ ] Coding test: Monaco editor + Judge0 runner (isolated service), test-case grading
- [ ] Whiteboard (tldraw + Yjs) and shared code pad inside the interview room
- [ ] Company reviews & ratings, platform admin panel
- [ ] Meilisearch, if Postgres search isn't enough

### Phase 7: Showcase

- [ ] README: pitch, GIF, live demo + demo logins, architecture diagram, tech stack, run locally
- [ ] `docs/adr/` short decision records (monolith vs microservices, Postgres vs Mongo, LiveKit)
- [ ] Credit the original 2024 team and link the original repo

---

## 6. Definition of done (MVP = Phases 0–4)

- A seeker can sign up, build a profile, find a job, apply, pass an MCQ and join a scheduled video interview
- An employer can create a company, post a job with a test, review ranked applicants and schedule an interview
- Every API route is authenticated and authorized. No secrets in the repo. Test answers never reach the client
- Deployed at a public URL with seeded demo data and demo accounts
- CI is green. Golden-path e2e test passes

## 7. Lessons from the 2024 version

| 2024 problem                                            | Fix in the rebuild                               |
| ------------------------------------------------------- | ------------------------------------------------ |
| Secrets committed to a public repo                      | `.env.example` only. Secret scanning in CI       |
| Plaintext passwords, `userId` in localStorage as "auth" | argon2 + httpOnly cookie sessions + guards       |
| No authorization on API routes                          | Role and ownership guards on every endpoint      |
| MCQ correct answers sent to the browser                 | Server-only grading. Answer key never serialized |
| Mongo string IDs, filtering whole collections in JS     | Postgres relations, indexed queries, pagination  |
| 100ms polling for updates                               | WebSockets                                       |
| Interviews had no date/time                             | Real scheduling + reminders                      |
| Hard-coded categories, rating "4.8", "Remote"           | Real fields and data                             |

## 8. Open questions

- Keep the original team credited as co-authors, or only link the original repo?
- Is the coding test in scope (P2) or should it be cut?
- Keep **Learning Hours / My Courses** from the Profile frame, or drop it? It doesn't fit the core product
- LiveKit vs staying with Agora?
