# 0001. A modular monolith, not microservices

**Status:** accepted

## Context

The 2024 project was a single Next.js app whose API routes reached straight into MongoDB, with no
authorization. The rebuild needed clear boundaries (accounts, companies, jobs, applications,
assessments, interviews, notifications, email), one developer to build it, and free hosting with one
small server.

## Decision

One NestJS API process with a module per domain, plus a separate BullMQ worker for background jobs,
in a pnpm + Turborepo monorepo. Modules talk through exported services, not each other's tables.
Validation schemas and types live in `packages/shared` and are used by the web app, API and worker.

## Consequences

- One deploy, one database, transactions across domains, and no network calls between services.
- The boundaries are real enough that a module (for example a code runner) could move out later.
- Everything scales together. For a portfolio project's traffic, that's fine.
