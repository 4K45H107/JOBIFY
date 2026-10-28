import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ZodValidationException } from "nestjs-zod";
import { ZodError } from "zod";

/** Shape of every error response the API returns. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const body: ApiErrorBody = {
      ...this.describe(exception),
      path: httpAdapter.getRequestUrl(request),
      timestamp: new Date().toISOString(),
    };

    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    httpAdapter.reply(ctx.getResponse(), body, body.statusCode);
  }

  private describe(
    exception: unknown,
  ): Pick<ApiErrorBody, "statusCode" | "error" | "message" | "details"> {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as ZodError;
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: "Bad Request",
        message: "Validation failed",
        details: zodError.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const body =
        typeof response === "string"
          ? { message: response }
          : (response as { message?: unknown; details?: unknown });
      return {
        statusCode: status,
        error: statusName(status),
        message: String(body.message ?? exception.message),
        // Services can attach structured details, e.g. per-question errors.
        ...(body.details !== undefined && { details: body.details }),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "Something went wrong",
    };
  }
}

/** 404 -> "Not Found", 422 -> "Unprocessable Entity". */
function statusName(status: number): string {
  const key = HttpStatus[status];
  if (!key) return "Error";
  return key
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
