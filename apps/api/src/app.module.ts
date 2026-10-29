import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { ApplicationsModule } from "./applications/applications.module";
import { AssessmentsModule } from "./assessments/assessments.module";
import { AuthModule } from "./auth/auth.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { validateEnv } from "./config/env";
import { HealthModule } from "./health/health.module";
import { CompaniesModule } from "./companies/companies.module";
import { FilesModule } from "./files/files.module";
import { InterviewsModule } from "./interviews/interviews.module";
import { JobsModule } from "./jobs/jobs.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { RedisModule } from "./redis/redis.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // apps/api/.env first, then the repo-root .env.
      envFilePath: [".env", "../../.env"],
      validate: validateEnv,
    }),
    // Generous default; credential endpoints set a stricter @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 300 }],
      skipIf: () => process.env.THROTTLE_DISABLED === "true",
    }),
    PrismaModule,
    StorageModule,
    RedisModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    FilesModule,
    ProfileModule,
    CompaniesModule,
    JobsModule,
    ApplicationsModule,
    AssessmentsModule,
    InterviewsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
