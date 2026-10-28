# Jobify

A hiring platform with two sides. Job seekers discover jobs, apply, take skill tests and join interviews.
Employers post jobs, screen applicants and run interviews, all in one app.

A rebuild of the 2024 CSE408 (BUET) team project. See [`PLAN.md`](PLAN.md) for the features,
architecture and roadmap.

## Repository layout

```
apps/web          Next.js frontend
packages/shared   Zod schemas, types and enums shared across apps
packages/tsconfig Shared TypeScript configs
```

## Getting started

Requirements: Node 22+, pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install
cp .env.example .env
pnpm db:up        # Postgres (host port 5433) + Redis (6379)
pnpm dev          # web on http://localhost:3000
```

## Scripts

| Command          | What it does                |
| ---------------- | --------------------------- |
| `pnpm build`     | Build every app and package |
| `pnpm lint`      | ESLint                      |
| `pnpm typecheck` | TypeScript, no emit         |
| `pnpm test`      | Unit tests                  |
| `pnpm format`    | Prettier                    |
