# Architecture decision records

Short notes on the decisions that shaped Jobify: the situation, what was decided, and what it cost
or bought. They're written for someone reading the code for the first time.

| #                                                        | Decision                                                  |
| -------------------------------------------------------- | --------------------------------------------------------- |
| [0001](0001-modular-monolith.md)                         | A modular monolith, not microservices                     |
| [0002](0002-postgres-and-prisma.md)                      | PostgreSQL with Prisma, replacing MongoDB                 |
| [0003](0003-livekit-for-video.md)                        | LiveKit for video interviews                              |
| [0004](0004-free-tier-hosting.md)                        | Free-tier hosting, and no keep-awake ping                 |
| [0005](0005-own-auth-and-direct-google-sign-in.md)       | Our own sign-in, and Google sign-in without Auth0         |
| [0006](0006-coding-problems-in-code-grading-deferred.md) | Coding problems as code; grading deferred                 |
| [0007](0007-search-in-postgres.md)                       | Job search in Postgres, not a search engine or embeddings |
| [0008](0008-live-notepad-over-livekit.md)                | The interview notepad travels over the LiveKit room       |
