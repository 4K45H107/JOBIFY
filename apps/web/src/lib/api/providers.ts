import "server-only";
import type { AuthProviders } from "@jobify/shared";
import { serverApi } from "./server";

/** Whether "Continue with Google" is configured. Hidden if the API can't say. */
export async function googleSignInEnabled(): Promise<boolean> {
  try {
    return (await serverApi<AuthProviders>("/auth/providers")).google;
  } catch {
    return false;
  }
}
