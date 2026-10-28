import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Skips the global JWT guard for this route or controller. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
