import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Inline styles: email clients ignore stylesheets. Colours match the web app's light theme.
const font = "Outfit, 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const footerText = { fontSize: 12, lineHeight: "18px", color: "#6b6b6b", margin: 0 };
export const footerLink = { color: "#2967b0" };

export interface LayoutProps {
  preview: string;
  greetingName: string | null;
  title: string;
  /** Paragraphs under the title. */
  body: string[];
  /** A bold line after the body, e.g. the interview time. */
  detail?: string;
  actionLabel: string;
  actionUrl: string;
  footer: React.ReactNode;
}

/** The frame every Jobify email shares: black bar, greeting, message, button, footer. */
export function Layout(p: LayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{p.preview}</Preview>
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
            {p.body.map((paragraph, i) => (
              <Text
                key={i}
                style={{ fontSize: 16, lineHeight: "24px", color: "#2c2d2f", margin: "0 0 8px" }}
              >
                {paragraph}
              </Text>
            ))}
            {p.detail && (
              <Text style={{ fontSize: 16, fontWeight: 600, color: "#000000", margin: "4px 0 0" }}>
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
                marginTop: 20,
              }}
            >
              {p.actionLabel}
            </Button>
          </Section>
          <Hr style={{ borderColor: "#e4e4e7", margin: 0 }} />
          <Section style={{ padding: "16px 28px" }}>{p.footer}</Section>
        </Container>
      </Body>
    </Html>
  );
}
