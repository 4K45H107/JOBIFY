# CLAUDE.md

Rebuild of Jobify, the CSE408 (BUET, 2024) team project, as a deployed portfolio project.
Original code: https://github.com/4K45H107/CSE408_JOBIFY

## Source of truth
- **Roadmap:** `PLAN.md` covers features (P0/P1/P2), architecture and phased tasks. Work through the
  Phase checklist tasks **one at a time, in order**. Tick the checkbox in `PLAN.md` as part of the
  task's PR once it's done.
- **UI:** the Figma file `JOBIFY` (file key `MJg6o8oT8Tp7aBM8Zx8Qfe`, Page 1). Build screens from the
  frame named in `PLAN.md` §4 (use the Figma MCP to read the frame). Treat generated code as a reference
  and adapt it to the shared components and tokens. Screens Figma doesn't have (auth, onboarding,
  notifications, mobile) must match its visual style.
- **Architecture:** modular monolith in a pnpm + Turborepo monorepo (`apps/web` Next.js, `apps/api`
  NestJS, `apps/worker` BullMQ, `packages/*`). Modules talk only through exported services or
  domain events. Don't reach into another module's tables. Code execution (coding tests) only ever
  runs in the isolated runner, never in the API process.
- If a task needs a decision that changes `PLAN.md` (stack, scope, data model), ask first, then update
  `PLAN.md` in the same PR.

## Git & GitHub workflow
- `main` is the integration branch. Every roadmap task gets its own branch off an up-to-date `main`
  (e.g. `chore/monorepo-setup`, `feature/auth-api`, `feature/explore-jobs-ui`, `fix/...`).
  (`development` and `feat/auth-system` are older branches. Don't build on them. Port anything
  useful from them into a new task branch.)
- For each task: implement → test (lint, typecheck, build, run tests, exercise the endpoints/UI) →
  commit → review the diff → commit review fixes if any → push the branch → open a GitHub pull
  request into `main` → merge the PR on GitHub only when the work is done and verified → pull `main`
  locally.
- Never merge feature branches into `main` locally. Every merge goes through a PR so it stays in
  GitHub history. Merge with a merge commit (`gh pr merge --merge`), not squash or rebase.
- PR title: the proper name of the task. PR description: what the problem or feature was, how it was
  solved, and how it was tested. No Claude attribution in PRs either.
- `gh` on this Mac has two accounts, and the active one is the work account (`fahad-akash-107`). Run
  every `gh` command as the personal account: `GH_TOKEN=$(gh auth token --user 4K45H107) gh ...`.
  For `git push`/`fetch`, git has no stored credentials for this account, so use:
  `git -c credential.helper= -c 'credential.helper=!f() { echo username=4K45H107; echo "password=$(gh auth token --user 4K45H107)"; }; f' push -u origin <branch>`
- Commit messages: a proper, descriptive subject line. The body summarizes what the problem was and
  how it was solved, or what feature was implemented.
- Commits are authored by the user's personal GitHub account configured locally in this repo
  (`4K45H107 <fahad11.ahmed11@gmail.com>`). Never add Claude as author or co-author: no
  `Co-Authored-By` trailer, no "Generated with Claude Code" lines.
- Before committing, confirm `git config user.email` in the repo is the personal one, not the work
  account.
- Keep the remote (`origin`, GitHub) up to date: push each feature branch with its commits
  (`git push -u origin <branch>`). `main` is updated on GitHub by merging the PR.

## Engineering rules
- TypeScript everywhere. Validation schemas (Zod) and shared types live in `packages/shared`.
- Never commit secrets. Only `.env.example` goes in git, and real values live in the hosting provider.
- Every API endpoint is authenticated and authorized (role + ownership). Assessment answer keys
  never leave the API.
- Lists are paginated and filtered in the database, never by loading whole tables into memory.
- Keep the seed script working. Every new model gets demo data.
