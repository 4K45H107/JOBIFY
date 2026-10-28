/** Mirrors the API's error body (see AllExceptionsFilter). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  /** Validation issues (array) or per-field messages keyed by id (e.g. screening questions). */
  details?: { path: string; message: string }[] | Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
  }
}
