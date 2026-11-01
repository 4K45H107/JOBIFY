import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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

// Inline styles: email clients ignore stylesheets. Colours match the web app's light theme.
const font = "Outfit, 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** One layout for every notification email: black Jobify bar, message, button, footer. */
export function NotificationEmail(p: NotificationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{p.body}</Preview>
      <Body style={{ backgroundColor: "#f5f5f7", margin: 0, padding: "24px 0", fontFamily: font }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            maxWidth: 560,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <Section style={{ backgroundColor: "#000000", padding: "18px 28px" }}>
            <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: 700, margin: 0 }}>
              Jobify.
            </Text>
          </Section>
          <Section style={{ padding: "28px" }}>
            {p.greetingName && (
              <Text style={{ fontSize: 16, color: "#2c2d2f", margin: "0 0 12px" }}>
                {`Hi ${p.greetingName},`}
              </Text>
            )}
            <Text style={{ fontSize: 22, fontWeight: 600, color: "#000000", margin: "0 0 8px" }}>
              {p.title}
            </Text>
            <Text style={{ fontSize: 16, lineHeight: "24px", color: "#2c2d2f", margin: 0 }}>
              {p.body}
            </Text>
            {p.detail && (
              <Text style={{ fontSize: 16, fontWeight: 600, color: "#000000", margin: "12px 0 0" }}>
                {p.detail}
              </Text>
            )}
            <Button
              href={p.actionUrl}
              style={{
                backgroundColor: "#1f1d1d",
                color: "#fcfcff",
                borderRadius: 999,
                padding: "12px 24px",
                fontSize: 15,
                marginTop: 24,
              }}
            >
              {p.actionLabel}
            </Button>
          </Section>
          <Hr style={{ borderColor: "#e4e4e7", margin: 0 }} />
          <Section style={{ padding: "16px 28px" }}>
            <Text style={{ fontSize: 12, lineHeight: "18px", color: "#6b6b6b", margin: 0 }}>
              {`You get these emails because “${p.categoryLabel}” is on in your Jobify settings. `}
              <Link href={p.settingsUrl} style={{ color: "#2967b0" }}>
                Email settings
              </Link>{" "}
              ·{" "}
              <Link href={p.unsubscribeUrl} style={{ color: "#2967b0" }}>
                Unsubscribe from these
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
