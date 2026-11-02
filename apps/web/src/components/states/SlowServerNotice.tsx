"use client";

import { useEffect, useState } from "react";

/** Render's free tier sleeps after 15 idle minutes; the first request then takes up to a minute. */
const SLOW_AFTER_MS = 6000;

/** Shown under a loading screen once it's been loading long enough to be a cold start. */
export function SlowServerNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <p role="status" className="text-sm text-fg-subtle">
      {slow &&
        "Waking up the server. Jobify runs on a free plan that sleeps when nobody's using it, so the first visit can take up to a minute."}
    </p>
  );
}
