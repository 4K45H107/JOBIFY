import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true once the page runs in the browser. Text that
 * depends on the viewer's clock, time zone or locale must wait for it: the server renders in UTC,
 * a moment earlier, so the two would differ and React would reject the server HTML.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
