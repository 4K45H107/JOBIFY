import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  // Figma "SEARCH": filled dark pill.
  primary: "rounded-full border border-primary bg-primary text-primary-fg hover:opacity-90",
  // Figma filter buttons: outlined, 10px radius.
  outline: "rounded-[10px] border border-outline text-outline hover:bg-surface-grey",
  ghost: "rounded-[10px] text-fg hover:bg-surface-grey",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-5 text-sm",
  md: "h-10 px-8 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Figma buttons use uppercase labels with wide tracking. */
  caps?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  caps = true,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
        caps && "tracking-label uppercase",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
