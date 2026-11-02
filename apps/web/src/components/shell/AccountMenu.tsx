"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { AuthUser } from "@jobify/shared";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/api/client";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function AccountMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setOpen(false);
        button.current?.focus();
      } else if (!ref.current?.contains(event.target as Node)) {
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
        ref={button}
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chip"
      >
        <Avatar
          src={user.photoUrl}
          name={user.fullName ?? user.email}
          alt=""
          className="size-9 md:size-10"
        />
      </button>

      {open && (
        // A disclosure panel, not role="menu": it holds details and a theme switch, not just items.
        <div
          id={panelId}
          className="absolute right-0 z-20 mt-3 w-64 overflow-hidden rounded-[10px] border border-border bg-bg text-fg shadow-lg"
        >
          <Link
            href={user.role === "EMPLOYER" ? "/employer/settings" : "/settings"}
            onClick={() => setOpen(false)}
            className="block border-b border-border px-4 py-3 hover:bg-surface-grey"
          >
            <p className="truncate font-medium">{user.fullName ?? user.email}</p>
            <p className="truncate text-sm text-fg-subtle">{user.email}</p>
            {user.company && (
              <p className="mt-1 truncate text-sm text-fg-muted">
                {user.company.name}
                {user.company.status === "PENDING" && " · pending approval"}
              </p>
            )}
            <p className="mt-1 text-sm text-link">View profile</p>
          </Link>
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-sm text-fg-subtle">Theme</p>
            <ThemeSwitcher />
          </div>
          <button
            type="button"
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
