// Runs the API and the worker side by side in one container, for hosts whose free tier allows a
// single service (Render). They stay separate programs: if either exits, the other is stopped and
// the container exits too, so the host restarts both. Stop signals are passed on to both.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const apps = { api: "apps/api/dist/main.js", worker: "apps/worker/dist/main.js" };

const children = Object.entries(apps).map(([name, entry]) => {
  const child = spawn(process.execPath, [entry], { cwd: root, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    console.log(`[start-backend] ${name} exited (${signal ?? `code ${code}`}), stopping`);
    shutdown(code ?? 1);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  // Give both a moment to finish their current work, as they do on SIGTERM.
  setTimeout(() => process.exit(code), 10_000).unref();
  Promise.all(
    children.map((c) => (c.exitCode === null ? new Promise((r) => c.once("exit", r)) : null)),
  ).then(() => process.exit(code));
}

for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => shutdown(0));
