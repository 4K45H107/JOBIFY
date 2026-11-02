import { ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";

/**
 * Applying to and posting jobs need a verified email, so employers and applicants can reach
 * each other. Checked against the database: the access token doesn't carry it.
 */
export async function assertEmailVerified(prisma: PrismaService, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true },
  });
  if (!user?.emailVerifiedAt) {
    throw new ForbiddenException(
      "Verify your email first: open the link we emailed you, or send a new one from Settings › Account.",
    );
  }
}
