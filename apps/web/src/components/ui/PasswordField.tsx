"use client";

import { forwardRef, useState } from "react";
import { TextField, type TextFieldProps } from "./TextField";

/** A password input with a Show/Hide button, so people can check what they typed. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, "type">>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <TextField
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        inputClassName="pr-20"
        addon={
          <button
            type="button"
            aria-pressed={visible}
            aria-label="Show password"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-1 my-1 rounded-[8px] px-3 text-sm font-medium text-link hover:bg-surface-grey"
          >
            {visible ? "Hide" : "Show"}
          </button>
        }
      />
    );
  },
);
