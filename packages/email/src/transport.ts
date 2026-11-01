import nodemailer from "nodemailer";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface Mailer {
  /** "brevo" sends real email; "smtp" is Mailpit locally. */
  readonly provider: "brevo" | "smtp";
  /** Returns the provider's message id. Throws on failure, so the job is retried. */
  send(email: OutgoingEmail): Promise<string>;
}

/** `"Jobify <hi@x.com>"` -> { name, email }; a bare address works too. */
export function parseAddress(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || undefined, email: match[2]! } : { email: from.trim() };
}

/** Brevo's transactional email API (free plan: about 300 emails a day). */
export function brevoMailer(apiKey: string, from: string, fetchImpl = fetch): Mailer {
  const sender = parseAddress(from);
  return {
    provider: "brevo",
    async send(email) {
      const res = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: email.to }],
          subject: email.subject,
          htmlContent: email.html,
          textContent: email.text,
          headers: email.headers,
        }),
      });
      if (!res.ok) {
        // Brevo returns { code, message }; never include the key in the error.
        const detail = await res.text().catch(() => "");
        throw new Error(`Brevo ${res.status}: ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as { messageId?: string };
      return json.messageId ?? "";
    },
  };
}

/** Plain SMTP, used for Mailpit in development and CI. */
export function smtpMailer(url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url);
  return {
    provider: "smtp",
    async send(email) {
      const info = await transport.sendMail({ from, ...email });
      return info.messageId;
    },
  };
}

export function createMailer(config: {
  BREVO_API_KEY?: string;
  SMTP_URL: string;
  MAIL_FROM: string;
}): Mailer {
  return config.BREVO_API_KEY
    ? brevoMailer(config.BREVO_API_KEY, config.MAIL_FROM)
    : smtpMailer(config.SMTP_URL, config.MAIL_FROM);
}
