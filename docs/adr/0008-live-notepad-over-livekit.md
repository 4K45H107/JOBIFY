# 0008. The interview notepad travels over the LiveKit room

**Status:** accepted

## Context

During a video interview the candidate writes answers, as text or code, and the interviewer watches
them appear live. That needs a realtime channel, and saving for later.

## Decision

- **Live view:** the candidate's notepad is sent over the call's own LiveKit room as text streams,
  which chunk long text. Only the candidate types; the interviewer's view is read-only.
- **Saving:** it also autosaves to the API, so late joiners catch up, and it locks when the interview
  ends.

## Consequences

- No extra realtime server or WebSocket service, and no editing conflicts with a single writer.
- Both people editing at once would need a merge library such as Yjs. That's noted in the plan as a
  later step.
