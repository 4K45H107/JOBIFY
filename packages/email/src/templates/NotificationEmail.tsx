import { Link, Text } from "@react-email/components";
import { footerLink, footerText, Layout } from "./Layout";

export interface NotificationEmailProps {
  greetingName: string | null;
  title: string;
  body: string;
  /** Extra line under the body, e.g. the interview time. */
  detail?: string;
  actionLabel: string;
  actionUrl: string;
  /** Why they get it, e.g. "Interview reminders". */
  categoryLabel: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}

/** Every notification email: the shared layout with a settings / unsubscribe footer. */
export function NotificationEmail(p: NotificationEmailProps) {
  return (
    <Layout
      preview={p.body}
      greetingName={p.greetingName}
      title={p.title}
      body={[p.body]}
      detail={p.detail}
      actionLabel={p.actionLabel}
      actionUrl={p.actionUrl}
      footer={
        <Text style={footerText}>
          {`You get these emails because “${p.categoryLabel}” is on in your Jobify settings. `}
          <Link href={p.settingsUrl} style={footerLink}>
            Email settings
          </Link>{" "}
          ·{" "}
          <Link href={p.unsubscribeUrl} style={footerLink}>
            Unsubscribe from these
          </Link>
        </Text>
      }
    />
  );
}
