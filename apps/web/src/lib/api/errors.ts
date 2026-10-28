/** Mirrors the API's error body (see AllExceptionsFilter). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: { path: string; message: string }[];
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
