# 0004. Free-tier hosting, and no keep-awake ping

**Status:** accepted

## Context

The project had to run publicly at no cost.

## Decision

- **Vercel** for the web app.
- **Render's** free web service runs the API and the worker together (`scripts/start-backend.mjs`),
  with **Render Key Value** for Redis.
- **Neon** for Postgres and file storage.
- **LiveKit Cloud** for video, **Brevo** for email, and Google for sign-in.

Render's free service sleeps after 15 idle minutes. A cron ping could keep it awake, but every ping
would also wake Neon and spend its free compute, so it was deliberately not set up.

## Consequences

- The first visit after a quiet spell waits for a cold start (30–60 s). The web app shows a
  "waking up the server" note and a Try again page.
- Interview reminders pause while nobody is using the site.
- Everything is documented in `docs/DEPLOYMENT.md`, and a paid plan would remove both limits.
