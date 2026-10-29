import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Interview } from "@jobify/shared";
import { InterviewRoom } from "@/components/interviews/InterviewRoom";
import { ApiError } from "@/lib/api/errors";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Interview room" };

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const interview = await serverApi<Interview>(`/interviews/${(await params).id}`);
    return <InterviewRoom interview={interview} viewer="EMPLOYER" />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
