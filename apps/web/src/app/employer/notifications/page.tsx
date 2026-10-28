import type { Metadata } from "next";
import type { NotificationFeed } from "@jobify/shared";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page() {
  return <NotificationsPage initial={await serverApi<NotificationFeed>("/notifications")} />;
}
