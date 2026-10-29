# Jobify

[![CI](https://github.com/4K45H107/JOBIFY/actions/workflows/ci.yml/badge.svg)](https://github.com/4K45H107/JOBIFY/actions/workflows/ci.yml)

A hiring platform with two sides. Job seekers discover jobs, apply, take skill tests and join interviews.
Employers post jobs, screen applicants and run interviews, all in one app.

A rebuild of the 2024 CSE408 (BUET) team project. See [`PLAN.md`](PLAN.md) for the features,
architecture and roadmap.

## Repository layout

```
apps/web          Next.js frontend
apps/api          NestJS API (modular monolith)
apps/worker       Background jobs (BullMQ): interview reminders
packages/db       Prisma schema, migrations, client and seed data
packages/shared   Zod schemas, types and enums shared across apps
packages/tsconfig Shared TypeScript configs
```

## Getting started

**Full guide with all demo accounts and troubleshooting: [`docs/RUNNING_LOCALLY.md`](docs/RUNNING_LOCALLY.md).**

Requirements: Node 22+, pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install
cp .env.example .env
pnpm services:up  # Postgres (5433), Redis (6379), SeaweedFS S3 (8333), LiveKit (7880)
pnpm db:deploy    # create the database tables
pnpm db:seed      # demo data (re-runnable)
pnpm dev          # web on :3000, API on :4000/api, worker
```

API docs (OpenAPI / Swagger UI) are served at http://localhost:4000/api/docs.

### Demo accounts

After `pnpm db:seed`, every demo account uses the password `Password123!`:

| Email                 | Role                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| `seeker@jobify.dev`   | Job seeker with applications, saved jobs and an upcoming interview    |
| `employer@jobify.dev` | Admin of "Northwind Labs", with applicants and a pending join request |
| `admin@jobify.dev`    | Platform admin                                                        |

## Scripts

| Command          | What it does                |
| ---------------- | --------------------------- |
| `pnpm build`     | Build every app and package |
| `pnpm lint`      | ESLint                      |
| `pnpm typecheck` | TypeScript, no emit         |
| `pnpm test`      | Unit tests                  |
| `pnpm format`    | Prettier                    |

CI (GitHub Actions) runs format, build, migrations + seed, lint, typecheck and tests against Postgres on every pull request, plus a gitleaks secret scan.
