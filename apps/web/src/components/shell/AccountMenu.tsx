"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@jobify/shared";
import { api } from "@/lib/api/client";

export function AccountMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !ref.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chip"
      >
        <Image
          src="/icons/avatar.png"
          alt=""
          width={53}
          height={52}
          className="size-10 rounded-full md:size-[52px]"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-3 w-64 overflow-hidden rounded-[10px] border border-border bg-bg text-fg shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate font-medium">{user.fullName ?? user.email}</p>
            <p className="truncate text-sm text-fg-subtle">{user.email}</p>
            {user.company && (
              <p className="mt-1 truncate text-sm text-fg-muted">
                {user.company.name}
                {user.company.status === "PENDING" && " · pending approval"}
              </p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className="w-full px-4 py-3 text-left hover:bg-surface-grey disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
