import { UserRole } from "@jobify/shared";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-semibold">Jobify</h1>
      <span className="sr-only">{UserRole.options.join(", ")}</span>
    </main>
  );
}
