import { z } from "zod";

export const UserRole = z.enum(["SEEKER", "EMPLOYER", "ADMIN"]);
export type UserRole = z.infer<typeof UserRole>;
