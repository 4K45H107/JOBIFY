import { Text } from "@react-email/components";
import { footerText, Layout } from "./Layout";

export interface AccountEmailProps {
  greetingName: string | null;
  title: string;
  body: string[];
  actionLabel: string;
  actionUrl: string;
  /** Security note, e.g. "If you didn't ask for this, ignore this email." */
  footerNote: string;
}

/** Verify email, reset password, password changed. No unsubscribe: they're about the account. */
export function AccountEmail(p: AccountEmailProps) {
  return (
    <Layout
      preview={p.body[0] ?? p.title}
      greetingName={p.greetingName}
      title={p.title}
      body={p.body}
      actionLabel={p.actionLabel}
      actionUrl={p.actionUrl}
      footer={<Text style={footerText}>{p.footerNote}</Text>}
    />
  );
}
