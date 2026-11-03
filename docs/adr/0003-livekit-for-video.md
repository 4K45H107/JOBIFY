# 0003. LiveKit for video interviews

**Status:** accepted

## Context

Interviews happen in the app. The original used Agora. The rebuild needed a free tier, an open-source
server for local development, server-issued access tokens, and a way to close a room for everyone.

## Decision

LiveKit: LiveKit Cloud in production and the LiveKit server in Docker locally. The API issues a token
only to the two people in the interview, only from 10 minutes before the start to 15 minutes after.
Ending an interview deletes the room through LiveKit's server API.

## Consequences

- Same code locally and in production, and prebuilt React components for the call.
- The room also carries data, which the notepad uses (see 0008).
- Recording isn't used. Calls are live only, as the privacy page says.
