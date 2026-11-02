import { ApiError } from "./errors";

/** A message for a failed request: rate limit, the API's own message, or a generic one. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  if (error instanceof ApiError && error.status < 500 && error.body?.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
