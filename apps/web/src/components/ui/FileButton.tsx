"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { Button, type ButtonProps } from "./Button";

/**
 * Picks a file and POSTs it as multipart "file" to `endpoint`.
 * Size and type are checked here for quick feedback; the API checks again from the bytes.
 */
export function FileButton<T>({
  endpoint,
  accept,
  maxBytes,
  onUploaded,
  children,
  ...buttonProps
}: {
  endpoint: string;
  accept: readonly string[];
  maxBytes: number;
  onUploaded: (result: T) => void;
  children: React.ReactNode;
} & Omit<ButtonProps, "onClick" | "children">) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!accept.includes(file.type)) return setError("That file type isn't supported.");
    if (file.size > maxBytes)
      return setError(`Files must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);

    const body = new FormData();
    body.append("file", file);
    setBusy(true);
    try {
      onUploaded(await api<T>(endpoint, { method: "POST", body }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={input}
        type="file"
        accept={accept.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <Button
        {...buttonProps}
        disabled={busy || buttonProps.disabled}
        onClick={() => input.current?.click()}
      >
        {busy ? "Uploading…" : children}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-heading-accent">
          {error}
        </p>
      )}
    </div>
  );
}
