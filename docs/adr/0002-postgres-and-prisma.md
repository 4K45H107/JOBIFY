# 0002. PostgreSQL with Prisma, replacing MongoDB

**Status:** accepted

## Context

The original used MongoDB with Mongoose. The data is relational: users, companies and members,
jobs, applications with a stage history, tests and attempts, interviews and notifications, with many
"belongs to" and "unique per" rules.

## Decision

PostgreSQL through Prisma 7, with versioned migrations and a seed script. Neon hosts it in
production.

## Consequences

- Constraints do real work: one application per job and seeker, one skill test per job, one email
  log per notification.
- Migrations run on every deploy (`prisma migrate deploy`).
- Postgres features came for free later: full-text search, trigram similarity and edit distance for
  job search (see 0007).
- A few queries are raw SQL (search, the dashboard's per-day counts) where Prisma can't express them.
